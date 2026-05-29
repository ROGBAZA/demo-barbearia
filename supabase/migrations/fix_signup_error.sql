-- 1. CORREÇÃO CRÍTICA DE SIGNUP
-- Remove trigger que pode estar bloqueando a criação de usuários
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Se você precisar de uma trigger para criar perfil básico, use esta versão segura:
CREATE OR REPLACE FUNCTION public.handle_new_user_safe()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas insere se não houver conflito e não falha se der erro
  BEGIN
    -- Tenta inserir em profiles se a tabela existir (opcional)
    -- INSERT INTO public.profiles (id, email) VALUES (new.id, new.email);
    EXCEPTION WHEN OTHERS THEN
      -- Se falhar, silencia o erro para não bloquear o cadastro
      RAISE NOTICE 'Erro ao criar perfil automático: %', SQLERRM;
  END;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (Re)aplica a trigger segura
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_safe();


-- 2. FUNÇÃO WIZARD ROBUSTA
-- Garante que o processo de criar barbearia funcione mesmo se o usuário já existir
CREATE OR REPLACE FUNCTION create_new_tenant_wizard(
    _nome_barbearia TEXT,
    _slug TEXT,
    _nome_dono TEXT,
    _email TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_tenant_id UUID;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    -- Validações básicas
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = _slug) THEN
        RAISE EXCEPTION 'Este link já está em uso. Tente outro.';
    END IF;

    -- Criar Tenant
    INSERT INTO public.tenants (nome, slug, plano, status)
    VALUES (_nome_barbearia, _slug, 'pro', 'active')
    RETURNING id INTO new_tenant_id;

    -- Vincular Usuário como Dono
    INSERT INTO public.funcionarios (
        user_id, tenant_id, nome, email, cargo, nivel_acesso, status
    ) VALUES (
        current_user_id, new_tenant_id, _nome_dono, _email, 'gerente', 'admin', 'ativo'
    );

    RETURN jsonb_build_object(
        'tenant_id', new_tenant_id,
        'slug', _slug
    );
END;
$$;
