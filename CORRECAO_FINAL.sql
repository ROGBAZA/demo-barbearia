-- CORREÇÃO DEFINITIVA PARA MULTI-TENANT
-- Execute este SQL no Supabase Dashboard

-- 1. PRIMEIRO: Remover trigger que está interferindo
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Recriar função RPC melhorada
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
    -- Create the tenant with all required fields
    INSERT INTO public.tenants (
        nome, 
        slug, 
        plano, 
        status, 
        cor_primaria, 
        cor_secundaria, 
        created_at,
        updated_at
    ) VALUES (
        _nome_barbearia, 
        _slug, 
        'free', 
        'active', 
        '#000000', 
        '#FFD700', 
        NOW(),
        NOW()
    ) RETURNING id INTO new_tenant_id;

    -- Get the authenticated user ID
    SELECT auth.uid() INTO new_user_id;
    
    IF new_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- REMOVER QUALQUER ENTRADA ANTERIOR para evitar conflitos
    DELETE FROM public.user_roles WHERE user_id = new_user_id;
    DELETE FROM public.funcionarios WHERE user_id = new_user_id;
    DELETE FROM public.clientes WHERE user_id = new_user_id;

    -- Create user role as admin for this tenant
    INSERT INTO public.user_roles (user_id, tenant_id, role, created_at)
    VALUES (new_user_id, new_tenant_id, 'admin', NOW());

    -- Create employee profile for the owner
    INSERT INTO public.funcionarios (
        nome, 
        email, 
        cargo, 
        nivel_acesso, 
        ativo, 
        user_id, 
        tenant_id, 
        created_at,
        updated_at
    ) VALUES (
        _nome_dono, 
        _email, 
        'Administrador', 
        'administrador', 
        true, 
        new_user_id, 
        new_tenant_id, 
        NOW(),
        NOW()
    );

    -- Create default services for the new tenant
    INSERT INTO public.servicos (
        nome, 
        descricao, 
        preco, 
        tempo_estimado, 
        ativo, 
        tenant_id, 
        created_at,
        updated_at
    ) VALUES 
        ('Corte Masculino', 'Corte tradicional com máquina e tesoura', 30.00, 30, true, new_tenant_id, NOW(), NOW()),
        ('Corte + Barba', 'Pacote completo com barba', 50.00, 45, true, new_tenant_id, NOW(), NOW()),
        ('Barba', 'Aparação e modelagem de barba', 25.00, 20, true, new_tenant_id, NOW(), NOW()),
        ('Luzes', 'Aplicação de luzes no cabelo', 40.00, 60, true, new_tenant_id, NOW(), NOW());

    -- Create tenant settings
    INSERT INTO public.tenant_settings (
        tenant_id,
        mensagem_boas_vindas,
        termos_servico,
        politica_privacidade,
        intervalo_agendamento,
        antecedencia_minima_horas,
        created_at,
        updated_at
    ) VALUES (
        new_tenant_id,
        'Bem-vindo à ' || _nome_barbearia || '! Agende seu horário facilmente.',
        'Termos de serviço da ' || _nome_barbearia,
        'Política de privacidade da ' || _nome_barbearia,
        30,
        2,
        NOW(),
        NOW()
    );

    -- Return success with tenant ID
    RETURN jsonb_build_object(
        'success', true, 
        'tenant_id', new_tenant_id,
        'message', 'Tenant created successfully'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Return error information
        RETURN jsonb_build_object(
            'success', false, 
            'error', SQLERRM,
            'message', 'Failed to create tenant'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_new_tenant_wizard TO authenticated;

-- 3. CORRIGIR DADOS EXISTENTES (se houver)
UPDATE user_roles SET role = 'admin' 
WHERE user_id IN (
    SELECT DISTINCT f.user_id 
    FROM funcionarios f 
    WHERE f.nivel_acesso = 'administrador' 
    AND f.user_id IS NOT NULL
) AND role != 'admin';

-- 4. VERIFICAÇÃO FINAL
SELECT 'Função RPC criada com sucesso!' as status;
