-- ==========================================
-- RPC: create_new_tenant_wizard
-- Atomic transaction for creating new tenant with all required data
-- ==========================================

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
    result JSONB;
BEGIN
    -- Start atomic transaction
    -- 1. Create the tenant
    INSERT INTO public.tenants (
        nome,
        slug,
        plano,
        status,
        cor_primaria,
        cor_secundaria,
        created_at
    ) VALUES (
        _nome_barbearia,
        _slug,
        'free',
        'active',
        '#000000',
        '#FFD700',
        NOW()
    ) RETURNING id INTO new_tenant_id;

    -- 2. Create user role entry for the new tenant owner
    -- Get the user ID from the current authenticated user
    SELECT auth.uid() INTO new_user_id;
    
    IF new_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- 3. Create user role as admin for this tenant
    INSERT INTO public.user_roles (
        user_id,
        tenant_id,
        role,
        created_at
    ) VALUES (
        new_user_id,
        new_tenant_id,
        'admin',
        NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET
        tenant_id = new_tenant_id,
        role = 'admin';

    -- 4. Create employee profile for the owner
    INSERT INTO public.funcionarios (
        nome,
        email,
        cargo,
        nivel_acesso,
        ativo,
        user_id,
        tenant_id,
        created_at
    ) VALUES (
        _nome_dono,
        _email,
        'Administrador',
        'administrador',
        true,
        new_user_id,
        new_tenant_id,
        NOW()
    ) ON CONFLICT (user_id) DO UPDATE SET
        tenant_id = new_tenant_id;

    -- 5. Create default services for the new tenant
    INSERT INTO public.servicos (
        nome,
        descricao,
        preco,
        tempo_estimado,
        ativo,
        tenant_id,
        created_at
    ) VALUES 
        ('Corte Masculino', 'Corte tradicional com máquina e tesoura', 30.00, 30, true, new_tenant_id, NOW()),
        ('Corte + Barba', 'Pacote completo com corte e barba', 50.00, 45, true, new_tenant_id, NOW()),
        ('Barba', 'Aparação e modelagem de barba', 25.00, 20, true, new_tenant_id, NOW()),
        ('Luzes', 'Aplicação de luzes no cabelo', 40.00, 60, true, new_tenant_id, NOW())
    ON CONFLICT DO NOTHING;

    -- 6. Create tenant settings
    INSERT INTO public.tenant_settings (
        tenant_id,
        mensagem_boas_vindas,
        termos_servico,
        politica_privacidade,
        intervalo_agendamento,
        antecedencia_minima_horas,
        created_at
    ) VALUES (
        new_tenant_id,
        'Bem-vindo à ' || _nome_barbearia || '! Agende seu horário facilmente.',
        'Termos de serviço da ' || _nome_barbearia,
        'Política de privacidade da ' || _nome_barbearia,
        30,
        2,
        NOW()
    ) ON CONFLICT DO NOTHING;

    -- Build success result
    result := jsonb_build_object(
        'success', true,
        'tenant_id', new_tenant_id,
        'user_id', new_user_id,
        'message', 'Tenant created successfully'
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        -- Rollback happens automatically in PostgreSQL
        result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to create tenant'
        );
        
        RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_new_tenant_wizard TO authenticated;
