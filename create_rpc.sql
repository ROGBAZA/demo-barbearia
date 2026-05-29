-- Execute this in Supabase SQL Editor
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
    -- Create the tenant with all required fields INCLUDING operating hours
    INSERT INTO public.tenants (
        nome, 
        slug, 
        plano, 
        status, 
        cor_primaria, 
        cor_secundaria,
        dias_funcionamento,
        horario_abertura,
        horario_fechamento,
        created_at,
        updated_at
    ) VALUES (
        _nome_barbearia, 
        _slug, 
        'free', 
        'active', 
        '#000000', 
        '#FFD700',
        ARRAY[1,2,3,4,5,6], -- Monday to Saturday
        '09:00:00',
        '18:00:00',
        NOW(),
        NOW()
    ) RETURNING id INTO new_tenant_id;

    -- Get the authenticated user ID
    SELECT auth.uid() INTO new_user_id;
    
    IF new_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Create user role as admin for this tenant
    INSERT INTO public.user_roles (user_id, tenant_id, role, created_at)
    VALUES (new_user_id, new_tenant_id, 'admin', NOW())
    ON CONFLICT (user_id) DO UPDATE SET 
        tenant_id = new_tenant_id, 
        role = 'admin';

    -- Create employee profile for the owner with CORRECT nivel_acesso AND working hours
    INSERT INTO public.funcionarios (
        nome, 
        email, 
        cargo, 
        nivel_acesso, 
        ativo, 
        user_id, 
        tenant_id,
        horario_inicio,
        horario_fim,
        dias_trabalho,
        created_at,
        updated_at
    ) VALUES (
        _nome_dono, 
        _email, 
        'barbeiro', 
        'administrador', 
        true, 
        new_user_id, 
        new_tenant_id,
        '09:00:00',
        '18:00:00',
        ARRAY[1,2,3,4,5,6], -- Monday to Saturday
        NOW(),
        NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET 
        tenant_id = new_tenant_id,
        nivel_acesso = 'administrador',
        horario_inicio = '09:00:00',
        horario_fim = '18:00:00',
        dias_trabalho = ARRAY[1,2,3,4,5,6];

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
        ('Luzes', 'Aplicação de luzes no cabelo', 40.00, 60, true, new_tenant_id, NOW(), NOW())
    ON CONFLICT DO NOTHING;

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
    ) ON CONFLICT (tenant_id) DO UPDATE SET
        updated_at = NOW();

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
