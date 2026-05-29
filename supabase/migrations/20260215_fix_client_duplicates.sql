-- Fix client duplicates and missing RPC functions
-- This migration fixes two critical issues:
-- 1. Client duplicates caused by missing get_or_create_client_public function
-- 2. Missing appointment display due to incorrect RPC implementation

-- ============================================
-- PART 1: Fix Client Duplicates
-- ============================================

-- First, let's create a unique constraint on clientes to prevent future duplicates
-- We'll use telefone + tenant_id as the unique identifier
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_telefone_tenant_unique') THEN
        ALTER TABLE public.clientes DROP CONSTRAINT clientes_telefone_tenant_unique;
    END IF;

    -- Create the unique constraint
    -- This prevents duplicate clients with the same phone in the same tenant
    ALTER TABLE public.clientes 
    ADD CONSTRAINT clientes_telefone_tenant_unique 
    UNIQUE (tenant_id, telefone);
EXCEPTION
    WHEN duplicate_key THEN
        -- If there are existing duplicates, we need to clean them first
        RAISE NOTICE 'Duplicates exist. Please run cleanup script first.';
END $$;

-- ============================================
-- PART 2: Create get_or_create_client_public RPC
-- ============================================

CREATE OR REPLACE FUNCTION public.get_or_create_client_public(
    p_tenant_id UUID,
    p_nome TEXT,
    p_telefone TEXT,
    p_email TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_client_id UUID;
    v_normalized_phone TEXT;
BEGIN
    -- Normalize phone number (remove non-digits)
    v_normalized_phone := regexp_replace(p_telefone, '[^0-9]', '', 'g');
    
    -- Try to find existing client by phone and tenant
    SELECT id INTO v_client_id
    FROM public.clientes
    WHERE tenant_id = p_tenant_id
    AND regexp_replace(telefone, '[^0-9]', '', 'g') = v_normalized_phone
    LIMIT 1;
    
    -- If not found, create new client
    IF v_client_id IS NULL THEN
        INSERT INTO public.clientes (
            tenant_id,
            nome,
            telefone,
            email,
            user_id,
            data_cadastro
        )
        VALUES (
            p_tenant_id,
            p_nome,
            p_telefone,
            p_email,
            p_user_id,
            NOW()
        )
        RETURNING id INTO v_client_id;
    ELSE
        -- Update existing client if needed (e.g., if user_id was missing)
        UPDATE public.clientes
        SET 
            email = COALESCE(p_email, email),
            user_id = COALESCE(p_user_id, user_id),
            nome = COALESCE(p_nome, nome)
        WHERE id = v_client_id;
    END IF;
    
    RETURN v_client_id;
END;
$$;

-- ============================================
-- PART 3: Create or Update create_agendamento_publico RPC
-- ============================================

CREATE OR REPLACE FUNCTION public.create_agendamento_publico(
    p_cliente_id UUID,
    p_servico_id UUID,
    p_funcionario_id UUID,
    p_data_hora TIMESTAMP WITH TIME ZONE,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_agendamento_id UUID;
    v_tenant_id UUID;
BEGIN
    -- Get tenant_id from funcionario
    SELECT tenant_id INTO v_tenant_id
    FROM public.funcionarios
    WHERE id = p_funcionario_id;
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Funcionário não encontrado';
    END IF;
    
    -- Create the appointment
    INSERT INTO public.agendamentos (
        tenant_id,
        cliente_id,
        servico_id,
        funcionario_id,
        data_hora,
        status,
        observacoes,
        created_at,
        updated_at
    )
    VALUES (
        v_tenant_id,
        p_cliente_id,
        p_servico_id,
        p_funcionario_id,
        p_data_hora,
        'agendado',
        p_observacoes,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_agendamento_id;
    
    RETURN v_agendamento_id;
END;
$$;

-- ============================================
-- PART 4: Grant Permissions
-- ============================================

-- Grant execute permissions to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.get_or_create_client_public(UUID, TEXT, TEXT, TEXT, UUID) 
TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_agendamento_publico(UUID, UUID, UUID, TIMESTAMP WITH TIME ZONE, TEXT) 
TO anon, authenticated, service_role;

-- ============================================
-- PART 5: RLS Policies for Public Access
-- ============================================

-- Ensure clientes table has proper RLS
-- Enable RLS if not already enabled
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them
DROP POLICY IF EXISTS "Public can insert clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can view own tenant clients" ON public.clientes;
DROP POLICY IF EXISTS "Service role has full access to clients" ON public.clientes;

-- Policy: Anyone can insert clients (handled by RPC with tenant isolation)
CREATE POLICY "Public can insert clients" ON public.clientes
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy: Users can view clients from their tenant
CREATE POLICY "Users can view own tenant clients" ON public.clientes
FOR SELECT
TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()
    )
);

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to clients" ON public.clientes
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure agendamentos table has proper RLS for public viewing
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- Drop and recreate agendamentos policies
DROP POLICY IF EXISTS "Public can insert agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Users can view own tenant agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Service role has full access to agendamentos" ON public.agendamentos;

-- Policy: Anyone can insert agendamentos (via RPC)
CREATE POLICY "Public can insert agendamentos" ON public.agendamentos
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy: Users can view agendamentos from their tenant
CREATE POLICY "Users can view own tenant agendamentos" ON public.agendamentos
FOR SELECT
TO authenticated
USING (
    tenant_id IN (
        SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()
    )
);

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to agendamentos" ON public.agendamentos
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- PART 6: Cleanup Script (Run this separately if needed)
-- ============================================

-- This is a query to identify and merge duplicate clients
-- Run this BEFORE adding the unique constraint if you have existing duplicates

/*
-- Find duplicates
WITH duplicates AS (
    SELECT 
        tenant_id,
        regexp_replace(telefone, '[^0-9]', '', 'g') as normalized_phone,
        array_agg(id ORDER BY data_cadastro ASC) as ids,
        COUNT(*) as dup_count
    FROM public.clientes
    WHERE telefone IS NOT NULL
    GROUP BY tenant_id, regexp_replace(telefone, '[^0-9]', '', 'g')
    HAVING COUNT(*) > 1
)
SELECT * FROM duplicates;

-- To merge duplicates (run this carefully after reviewing):
-- This will keep the oldest client and update all references
DO $$
DECLARE
    dup RECORD;
    keep_id UUID;
    delete_ids UUID[];
BEGIN
    FOR dup IN 
        WITH duplicates AS (
            SELECT 
                tenant_id,
                regexp_replace(telefone, '[^0-9]', '', 'g') as normalized_phone,
                array_agg(id ORDER BY data_cadastro ASC) as ids,
                COUNT(*) as dup_count
            FROM public.clientes
            WHERE telefone IS NOT NULL
            GROUP BY tenant_id, regexp_replace(telefone, '[^0-9]', '', 'g')
            HAVING COUNT(*) > 1
        )
        SELECT * FROM duplicates
    LOOP
        keep_id := dup.ids[1];  -- Keep the oldest
        delete_ids := dup.ids[2:array_length(dup.ids, 1)];  -- Delete the rest
        
        -- Update agendamentos to point to the kept client
        UPDATE public.agendamentos
        SET cliente_id = keep_id
        WHERE cliente_id = ANY(delete_ids);
        
        -- Update fila_espera if it exists
        UPDATE public.fila_espera
        SET cliente_id = keep_id
        WHERE cliente_id = ANY(delete_ids);
        
        -- Delete duplicate clients
        DELETE FROM public.clientes
        WHERE id = ANY(delete_ids);
        
        RAISE NOTICE 'Merged % duplicates for phone %', array_length(delete_ids, 1), dup.normalized_phone;
    END LOOP;
END $$;
*/
