-- ========================================================
-- ELITE SAAS MULTI-TENANT ISOLATION & CUSTOMIZATION
-- ========================================================
-- INSTRUÇÕES: Execute este script no SQL Editor do Supabase.
-- Ele garante que cada barbearia seja 100% isolada e personalizável.

-- 1. ESTRUTURA BASE (Tenant & Branding)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS cor_primaria TEXT DEFAULT '#EAB308';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS cor_secundaria TEXT DEFAULT '#000000';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS fonte_primaria TEXT DEFAULT 'Inter';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- 2. TABELA DE CONFIGURAÇÕES (Tenant Settings)
CREATE TABLE IF NOT EXISTS public.tenant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
    nome_barbearia TEXT,
    endereco TEXT,
    telefone TEXT,
    email TEXT,
    horario_abertura TIME DEFAULT '08:00',
    horario_fechamento TIME DEFAULT '18:00',
    dias_funcionamento INTEGER[] DEFAULT '{1,2,3,4,5,6}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FUNÇÃO DE SEGURANÇA (O Coração do Isolamento)
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID AS $$
DECLARE
    tid UUID;
BEGIN
    -- 1. Verifica no user_roles (mais rápido e seguro)
    SELECT tenant_id INTO tid FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
    
    -- 2. Fallback para funcionários se não estiver em user_roles
    IF tid IS NULL THEN
        SELECT tenant_id INTO tid FROM public.funcionarios WHERE user_id = auth.uid() LIMIT 1;
    END IF;

    -- 3. Fallback para clientes
    IF tid IS NULL THEN
        SELECT tenant_id INTO tid FROM public.clientes WHERE user_id = auth.uid() LIMIT 1;
    END IF;

    RETURN tid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. HABILITAR RLS EM TUDO (Isolamento Total)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fila_espera ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas_clientes ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS DE ISOLAMENTO (Ninguém vê dados de outros)
-- Tenants: Admins veem o seu próprio, todos veem o público
DROP POLICY IF EXISTS "Users can view their own tenant" ON public.tenants;
CREATE POLICY "Users can view their own tenant" ON public.tenants
FOR SELECT USING (id = public.get_auth_tenant_id() OR slug = 'default');

-- Outras tabelas: Filtragem automática por tenant_id
DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' 
    AND table_name IN ('agendamentos', 'clientes', 'funcionarios', 'servicos', 'fila_espera', 'planos', 'assinaturas_clientes', 'tenant_settings') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Tenant Isolation" ON public.%I FOR ALL USING (tenant_id = public.get_auth_tenant_id())', t);
    END LOOP;
END $$;

-- 6. RPC: get_tenant_config
CREATE OR REPLACE FUNCTION public.get_tenant_config(t_id UUID)
RETURNS SETOF public.tenant_settings AS $$
BEGIN
    -- Permitir leitura se for o tenant do usuário ou se for acesso público (para agendamento)
    RETURN QUERY 
    SELECT * FROM public.tenant_settings 
    WHERE tenant_id = t_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: upsert_tenant_config (Branding + Settings)
CREATE OR REPLACE FUNCTION public.upsert_tenant_config(
    _tenant_id UUID,
    _nome_barbearia TEXT,
    _endereco TEXT DEFAULT NULL,
    _telefone TEXT DEFAULT NULL,
    _email TEXT DEFAULT NULL,
    _horario_abertura TIME DEFAULT NULL,
    _horario_fechamento TIME DEFAULT NULL,
    _dias_funcionamento INTEGER[] DEFAULT NULL,
    _logo_url TEXT DEFAULT NULL,
    _banner_url TEXT DEFAULT NULL,
    _cor_primaria TEXT DEFAULT NULL,
    _cor_secundaria TEXT DEFAULT NULL,
    _fonte_primaria TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    auth_tid UUID;
BEGIN
    auth_tid := public.get_auth_tenant_id();
    IF auth_tid != _tenant_id THEN
        RAISE EXCEPTION 'Acesso negado: ID % não corresponde ao seu tenant %', _tenant_id, auth_tid;
    END IF;

    -- Atualiza Tabela Tenants (Branding)
    UPDATE public.tenants SET
        nome = COALESCE(_nome_barbearia, nome),
        logo_url = COALESCE(_logo_url, logo_url),
        banner_url = COALESCE(_banner_url, banner_url),
        cor_primaria = COALESCE(_cor_primaria, cor_primaria),
        cor_secundaria = COALESCE(_cor_secundaria, cor_secundaria),
        fonte_primaria = COALESCE(_fonte_primaria, fonte_primaria),
        updated_at = NOW()
    WHERE id = _tenant_id;

    -- Upsert Tenant Settings
    INSERT INTO public.tenant_settings (
        tenant_id, nome_barbearia, endereco, telefone, email, 
        horario_abertura, horario_fechamento, dias_funcionamento, updated_at
    ) VALUES (
        _tenant_id, _nome_barbearia, _endereco, _telefone, _email, 
        _horario_abertura, _horario_fechamento, _dias_funcionamento, NOW()
    )
    ON CONFLICT (tenant_id) DO UPDATE SET
        nome_barbearia = EXCLUDED.nome_barbearia,
        endereco = EXCLUDED.endereco,
        telefone = EXCLUDED.telefone,
        email = EXCLUDED.email,
        horario_abertura = EXCLUDED.horario_abertura,
        horario_fechamento = EXCLUDED.horario_fechamento,
        dias_funcionamento = EXCLUDED.dias_funcionamento,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC: create_new_tenant_wizard (Consolidado)
CREATE OR REPLACE FUNCTION public.create_new_tenant_wizard(
    _nome_barbearia TEXT,
    _slug TEXT,
    _nome_dono TEXT,
    _email TEXT
)
RETURNS JSONB AS $$
DECLARE
    new_tenant_id UUID;
    new_user_id UUID;
BEGIN
    SELECT auth.uid() INTO new_user_id;
    IF new_user_id IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;

    -- Criar Tenant
    INSERT INTO public.tenants (nome, slug, cor_primaria, cor_secundaria, fonte_primaria)
    VALUES (_nome_barbearia, _slug, '#EAB308', '#000000', 'Inter')
    RETURNING id INTO new_tenant_id;

    -- Role (Update Primary Role)
    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES (new_user_id, new_tenant_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET tenant_id = new_tenant_id, role = 'admin';

    -- Funcionário (Garantir entrada única para este usuário como Admin do novo Tenant)
    -- Se ele já for funcionário de outro lugar, ele ganhará um novo vínculo aqui (se a PK permitir)
    -- Ou simplesmente criamos/atualizamos o vínculo dele como dono.
    INSERT INTO public.funcionarios (nome, email, cargo, nivel_acesso, ativo, user_id, tenant_id)
    VALUES (_nome_dono, _email, 'Proprietário', 'administrador', true, new_user_id, new_tenant_id);

    -- Configs
    INSERT INTO public.tenant_settings (tenant_id, nome_barbearia, email)
    VALUES (new_tenant_id, _nome_barbearia, _email);

    -- Serviços Clone
    INSERT INTO public.servicos (nome, preco, duracao_minutos, ativo, tenant_id)
    VALUES 
        ('Corte Masculino', 40.00, 30, true, new_tenant_id),
        ('Barba', 30.00, 20, true, new_tenant_id),
        ('Sobrancelha', 15.00, 10, true, new_tenant_id);

    RETURN jsonb_build_object('success', true, 'tenant_id', new_tenant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PERMISSÕES
GRANT EXECUTE ON FUNCTION public.get_tenant_config TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_tenant_config TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_new_tenant_wizard TO authenticated;
