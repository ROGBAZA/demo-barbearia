-- ==========================================
-- SAAS MULTI-TENANT EVOLUTION SCRIPT (v2.0)
-- Objective: Data isolation, isolation by tenant, and RLS.
-- ==========================================

-- 1. TENANTS CORE TABLE
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text UNIQUE NOT NULL,
  plano text DEFAULT 'free',
  status text DEFAULT 'active',
  logo_url text,
  token_acesso uuid DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now()
);

-- 2. CREATE DEFAULT TENANT (Safety Fallback)
INSERT INTO public.tenants (nome, slug, plano)
VALUES ('Route 66 Principal', 'default', 'elite')
ON CONFLICT (slug) DO NOTHING;

-- 3. ENFORCE TENANT_ID IN ALL TABLES (Step by Step)
-- Clients
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.clientes SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'default') WHERE tenant_id IS NULL;

-- Employees
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.funcionarios SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'default') WHERE tenant_id IS NULL;

-- Services
ALTER TABLE public.servicos ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.servicos SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'default') WHERE tenant_id IS NULL;

-- Appointments
ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.agendamentos SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'default') WHERE tenant_id IS NULL;

-- Waitlist
ALTER TABLE public.fila_espera ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.fila_espera SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'default') WHERE tenant_id IS NULL;

-- 4. FORCE NOT NULL AFTER DATA MIGRATION
DO $$ 
BEGIN
  ALTER TABLE public.clientes ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.funcionarios ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.servicos ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.agendamentos ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE public.fila_espera ALTER COLUMN tenant_id SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Some columns might still be null or constraints already exist.';
END $$;

-- 5. USER ROLES AND PROFILE LINKING
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id),
  role text CHECK (role IN ('super_admin', 'admin', 'gerente', 'recepcionista', 'funcionario', 'cliente')),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- 6. SECURITY: RLS POLICIES (Example for Appointments)
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for agendamentos" ON public.agendamentos;
CREATE POLICY "Tenant isolation for agendamentos" ON public.agendamentos
FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- 7. REPEAT FOR OTHER TABLES
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation for clientes" ON public.clientes;
CREATE POLICY "Tenant isolation for clientes" ON public.clientes
FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE public.fila_espera ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation for fila_espera" ON public.fila_espera;
CREATE POLICY "Tenant isolation for fila_espera" ON public.fila_espera
FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- ==========================================
-- FINAL CHECK: RE-CREATE HANDLE NEW USER TRIGGER
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_tenant_id uuid;
BEGIN
  SELECT id INTO default_tenant_id FROM public.tenants WHERE slug = 'default';

  IF NEW.raw_user_meta_data->>'cargo' = 'cliente' OR NEW.raw_user_meta_data->>'cargo' IS NULL THEN
    INSERT INTO public.clientes (nome, email, user_id, tenant_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'nome', 'Cliente'),
      NEW.email,
      NEW.id,
      COALESCE((NEW.raw_user_meta_data->>'tenant_id')::uuid, default_tenant_id)
    )
    ON CONFLICT (email) DO UPDATE 
    SET user_id = EXCLUDED.user_id
    WHERE public.clientes.user_id IS NULL;
    
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (NEW.id, 'cliente', COALESCE((NEW.raw_user_meta_data->>'tenant_id')::uuid, default_tenant_id))
    ON CONFLICT (user_id) DO NOTHING;

  ELSE
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'cargo', 'funcionario'),
      COALESCE((NEW.raw_user_meta_data->>'tenant_id')::uuid, default_tenant_id)
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
