-- CORREÇÃO DEFINITIVA - COM CASCADE
-- Execute este SQL completo no Supabase

-- 1. Remover trigger e função com CASCADE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Criar função RPC corrigida
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
    -- Create tenant
    INSERT INTO public.tenants (
        nome, slug, plano, status, cor_primaria, cor_secundaria, created_at, updated_at
    ) VALUES (
        _nome_barbearia, _slug, 'free', 'active', '#000000', '#FFD700', NOW(), NOW()
    ) RETURNING id INTO new_tenant_id;

    -- Get user ID
    SELECT auth.uid() INTO new_user_id;
    
    IF new_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Clean old data
    DELETE FROM public.user_roles WHERE user_id = new_user_id;
    DELETE FROM public.funcionarios WHERE user_id = new_user_id;

    -- Create user role as ADMIN
    INSERT INTO public.user_roles (user_id, tenant_id, role, created_at)
    VALUES (new_user_id, new_tenant_id, 'admin', NOW());

    -- Create employee profile
    INSERT INTO public.funcionarios (
        nome, email, cargo, nivel_acesso, ativo, user_id, tenant_id, created_at, updated_at
    ) VALUES (
        _nome_dono, _email, 'Administrador', 'administrador', true, new_user_id, new_tenant_id, NOW(), NOW()
    );

    -- Create default services
    INSERT INTO public.servicos (nome, descricao, preco, tempo_estimado, ativo, tenant_id, created_at, updated_at)
    VALUES 
        ('Corte Masculino', 'Corte tradicional com máquina e tesoura', 30.00, 30, true, new_tenant_id, NOW(), NOW()),
        ('Corte + Barba', 'Pacote completo com barba', 50.00, 45, true, new_tenant_id, NOW(), NOW()),
        ('Barba', 'Aparação e modelagem de barba', 25.00, 20, true, new_tenant_id, NOW(), NOW()),
        ('Luzes', 'Aplicação de luzes no cabelo', 40.00, 60, true, new_tenant_id, NOW(), NOW());

    -- Create tenant settings
    INSERT INTO public.tenant_settings (
        tenant_id, mensagem_boas_vindas, termos_servico, politica_privacidade, 
        intervalo_agendamento, antecedencia_minima_horas, created_at, updated_at
    ) VALUES (
        new_tenant_id,
        'Bem-vindo à ' || _nome_barbearia || '! Agende seu horário facilmente.',
        'Termos de serviço da ' || _nome_barbearia,
        'Política de privacidade da ' || _nome_barbearia,
        30, 2, NOW(), NOW()
    );

    -- Return success
    RETURN jsonb_build_object('success', true, 'tenant_id', new_tenant_id, 'message', 'Tenant created successfully');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Dar permissão
GRANT EXECUTE ON FUNCTION public.create_new_tenant_wizard TO authenticated;

-- 4. Verificação
SELECT 'Função RPC criada com sucesso!' as status;
