-- ========================================================
-- ULTIMATE MULTI-TENANT CONSOLIDATION & ISOLATION
-- ========================================================

-- 1. Garantir que as tabelas base existem com a estrutura correta
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    banner_url TEXT,
    cor_primaria TEXT DEFAULT '#EAB308',
    cor_secundaria TEXT DEFAULT '#000000',
    whatsapp TEXT,
    plano TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- 2. Função Auxiliar de Segurança (Resolvendo o Tenant do Usuário Logado)
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID AS $$
DECLARE
    tid UUID;
BEGIN
    -- Busca o tenantId do usuário na tabela user_roles
    SELECT tenant_id INTO tid FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
    RETURN tid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: get_tenant_config (Isolado e Seguro)
CREATE OR REPLACE FUNCTION public.get_tenant_config(t_id UUID)
RETURNS SETOF public.tenant_settings AS $$
BEGIN
    RETURN QUERY 
    SELECT * FROM public.tenant_settings 
    WHERE tenant_id = t_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: upsert_tenant_config (O Coração do Multi-tenant)
-- Esta função garante que as cores e informações sejam salvas APENAS no tenant do usuário logado.
CREATE OR REPLACE FUNCTION public.upsert_tenant_config(
    _tenant_id UUID,
    _nome_barbearia TEXT,
    _endereco TEXT,
    _telefone TEXT,
    _email TEXT,
    _horario_abertura TIME,
    _horario_fechamento TIME,
    _dias_funcionamento INTEGER[],
    _logo_url TEXT DEFAULT NULL,
    _banner_url TEXT DEFAULT NULL,
    _cor_primaria TEXT DEFAULT NULL,
    _cor_secundaria TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    auth_tid UUID;
BEGIN
    -- VERIFICAÇÃO DE SEGURANÇA: O usuário só pode editar o próprio tenant
    auth_tid := public.get_auth_tenant_id();
    
    IF auth_tid != _tenant_id THEN
        RAISE EXCEPTION 'Acesso negado: Você não pode alterar as configurações de outra barbearia.';
    END IF;

    -- 1. Atualiza as cores e imagem na tabela tenants
    UPDATE public.tenants SET
        nome = COALESCE(_nome_barbearia, nome),
        logo_url = COALESCE(_logo_url, logo_url),
        banner_url = COALESCE(_banner_url, banner_url),
        cor_primaria = COALESCE(_cor_primaria, cor_primaria),
        cor_secundaria = COALESCE(_cor_secundaria, cor_secundaria),
        updated_at = NOW()
    WHERE id = _tenant_id;

    -- 2. Insere ou Atualiza as configurações detalhadas
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

-- 5. RPC: create_new_tenant_wizard (Clonando Estilo do Roger)
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
    -- Determinar usuário autenticado
    SELECT auth.uid() INTO new_user_id;
    IF new_user_id IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado'; END IF;

    -- Criar Tenant com o "Estilo Roger" (Cores padrão de luxo)
    INSERT INTO public.tenants (nome, slug, cor_primaria, cor_secundaria, plano)
    VALUES (_nome_barbearia, _slug, '#EAB308', '#000000', 'free')
    RETURNING id INTO new_tenant_id;

    -- Vincular permissão de admin
    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES (new_user_id, new_tenant_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET tenant_id = new_tenant_id, role = 'admin';

    -- Criar perfil de funcionário (Dono)
    INSERT INTO public.funcionarios (nome, email, cargo, nivel_acesso, ativo, user_id, tenant_id)
    VALUES (_nome_dono, _email, 'Proprietário', 'administrador', true, new_user_id, new_tenant_id);

    -- Clonar serviços padrão (Roger Style)
    INSERT INTO public.servicos (nome, preco, duracao_minutos, ativo, tenant_id)
    VALUES 
        ('Corte Masculino', 35.00, 30, true, new_tenant_id),
        ('Barba Profissional', 30.00, 25, true, new_tenant_id),
        ('Corte + Barba (Combo)', 60.00, 50, true, new_tenant_id),
        ('Sobrancelha', 15.00, 15, true, new_tenant_id);

    -- Configurações Iniciais
    INSERT INTO public.tenant_settings (tenant_id, nome_barbearia, email)
    VALUES (new_tenant_id, _nome_barbearia, _email);

    RETURN jsonb_build_object('success', true, 'tenant_id', new_tenant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Garantir permissões de execução
GRANT EXECUTE ON FUNCTION public.get_tenant_config TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_tenant_config TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_new_tenant_wizard TO authenticated;
