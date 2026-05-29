-- ==========================================
-- FINAL MULTI-TENANT CONSOLIDATED MIGRATION
-- ==========================================

-- 1. Create Tenants Table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  logo_url TEXT,
  banner_url TEXT,
  cor_primaria VARCHAR(7) DEFAULT '#000000',
  cor_secundaria VARCHAR(7) DEFAULT '#FFD700',
  cor_fundo VARCHAR(7) DEFAULT '#FFFFFF',
  whatsapp VARCHAR(20),
  endereco TEXT,
  horario_funcionamento JSONB,
  ativo BOOLEAN DEFAULT true,
  plano VARCHAR(20) DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Default Tenant
INSERT INTO public.tenants (nome, slug, plano)
VALUES ('Route 66 Principal', 'default', 'elite')
ON CONFLICT (slug) DO NOTHING;

-- 3. Create Tenant Settings Table
CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  mensagem_boas_vindas TEXT,
  termos_servico TEXT,
  politica_privacidade TEXT,
  intervalo_agendamento INTEGER DEFAULT 30,
  antecedencia_minima_horas INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  role TEXT CHECK (role IN ('super_admin', 'admin', 'gerente', 'recepcionista', 'funcionario', 'cliente')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 5. Add tenant_id to existing tables
DO $$ 
BEGIN
  -- Clientes
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'clientes' AND COLUMN_NAME = 'tenant_id') THEN
    ALTER TABLE public.clientes ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
    UPDATE public.clientes SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'default') WHERE tenant_id IS NULL;
    ALTER TABLE public.clientes ALTER COLUMN tenant_id SET NOT NULL;
  END IF;

  -- Funcionarios
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'funcionarios' AND COLUMN_NAME = 'tenant_id') THEN
    ALTER TABLE public.funcionarios ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
    UPDATE public.funcionarios SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'default') WHERE tenant_id IS NULL;
    ALTER TABLE public.funcionarios ALTER COLUMN tenant_id SET NOT NULL;
  END IF;

  -- Servicos
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'servicos' AND COLUMN_NAME = 'tenant_id') THEN
    ALTER TABLE public.servicos ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
    UPDATE public.servicos SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'default') WHERE tenant_id IS NULL;
    ALTER TABLE public.servicos ALTER COLUMN tenant_id SET NOT NULL;
  END IF;

  -- Agendamentos
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'agendamentos' AND COLUMN_NAME = 'tenant_id') THEN
    ALTER TABLE public.agendamentos ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
    UPDATE public.agendamentos SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'default') WHERE tenant_id IS NULL;
    ALTER TABLE public.agendamentos ALTER COLUMN tenant_id SET NOT NULL;
  END IF;

  -- Fila de Espera
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'fila_espera' AND COLUMN_NAME = 'tenant_id') THEN
    ALTER TABLE public.fila_espera ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
    UPDATE public.fila_espera SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'default') WHERE tenant_id IS NULL;
    ALTER TABLE public.fila_espera ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

-- 6. Configure RLS Policies
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fila_espera ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Dynamic Policies based on tenant_id
-- We assume the tenant_id is passed via JWT or detected from the user role
-- For now, we allow reading if tenant_id matches the user's tenant_id

-- Helper function to get tenant_id from auth metadata or user_roles
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID AS $$
DECLARE
  tid UUID;
BEGIN
  -- Try to get from JWT metadata first
  tid := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;
  IF tid IS NULL THEN
    -- Fallback to user_roles table
    SELECT tenant_id INTO tid FROM public.user_roles WHERE user_id = auth.uid();
  END IF;
  RETURN tid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies
DROP POLICY IF EXISTS "Tenant Isolation" ON public.clientes;
CREATE POLICY "Tenant Isolation" ON public.clientes FOR ALL USING (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS "Tenant Isolation" ON public.agendamentos;
CREATE POLICY "Tenant Isolation" ON public.agendamentos FOR ALL USING (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS "Tenant Isolation" ON public.fila_espera;
CREATE POLICY "Tenant Isolation" ON public.fila_espera FOR ALL USING (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS "Tenant Isolation" ON public.servicos;
CREATE POLICY "Tenant Isolation" ON public.servicos FOR ALL USING (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS "Tenant Isolation" ON public.funcionarios;
CREATE POLICY "Tenant Isolation" ON public.funcionarios FOR ALL USING (tenant_id = public.get_auth_tenant_id());

-- 7. Trigger to link new users to tenants and roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_tenant_id UUID;
  target_tenant_id UUID;
  user_role TEXT;
BEGIN
  SELECT id INTO default_tenant_id FROM public.tenants WHERE slug = 'default';
  target_tenant_id := COALESCE((NEW.raw_user_meta_data->>'tenant_id')::UUID, default_tenant_id);
  user_role := COALESCE(NEW.raw_user_meta_data->>'cargo', 'cliente');

  -- Create role
  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (NEW.id, user_role, target_tenant_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create client profile if it's a client
  IF user_role = 'cliente' THEN
    INSERT INTO public.clientes (nome, email, user_id, tenant_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'nome', 'Novo Cliente'),
      NEW.email,
      NEW.id,
      target_tenant_id
    )
    ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id WHERE public.clientes.user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
