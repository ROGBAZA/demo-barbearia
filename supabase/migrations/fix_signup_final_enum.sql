-- CORREÇÃO FINAL DA FUNÇÃO DE CADASTRO
-- Ajusta os valores de ENUM para bater com o Schema: 
-- nivel_acesso = 'administrador'
-- cargo = 'gerente'

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
    
    -- Inserir Tenant (Barbearia)
    -- Se a coluna status ainda não existir, o postgres daria erro aqui, mas você já corrigiu.
    INSERT INTO public.tenants (nome, slug, plano, status)
    VALUES (_nome_barbearia, _slug, 'pro', 'active')
    RETURNING id INTO new_tenant_id;

    -- Inserir Dono como Funcionário Admin
    -- CORREÇÃO: Usando 'administrador' (enum correto) e 'gerente' (enum correto)
    INSERT INTO public.funcionarios (
        user_id, tenant_id, nome, email, cargo, nivel_acesso, status
    ) VALUES (
        current_user_id, new_tenant_id, _nome_dono, _email, 'gerente', 'administrador', 'ativo'
    );

    RETURN jsonb_build_object(
        'tenant_id', new_tenant_id,
        'message', 'Sucesso'
    );
END;
$$;
