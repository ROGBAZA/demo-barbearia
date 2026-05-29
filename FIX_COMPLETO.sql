-- ══════════════════════════════════════════════════════════════════
-- 🔥 CORREÇÃO COMPLETA DO SISTEMA - EXECUTE ESTE ARQUIVO UMA VEZ
-- ══════════════════════════════════════════════════════════════════
-- 
-- O QUE ESTE ARQUIVO FAZ:
-- ✅ Corrige TODAS as barbearias existentes (horários de trabalho)
-- ✅ Adiciona método de pagamento (Dinheiro/Pix/Cartão)
-- ✅ Atualiza função de criação de novas barbearias
--
-- RESULTADO: Sistema 100% funcional para TODAS as barbearias
-- TEMPO: 1 execução, 30 segundos
-- ══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════
-- PARTE 1: CORRIGE TODAS AS BARBEARIAS EXISTENTES
-- ══════════════════════════════════════════════════════════════════

DO $$ 
BEGIN
    RAISE NOTICE '🔧 PARTE 1/3: Corrigindo horários de todas as barbearias existentes...';
END $$;

-- 1.0 Adiciona colunas na tabela tenants SE não existirem
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS dias_funcionamento INTEGER[];

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS horario_abertura TIME;

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS horario_fechamento TIME;

-- 1.1 Adiciona horários padrão para TODOS os funcionários
UPDATE funcionarios
SET 
    horario_inicio = '09:00:00',
    horario_fim = '18:00:00',
    dias_trabalho = ARRAY[1,2,3,4,5,6], -- Segunda a Sábado
    updated_at = NOW()
WHERE horario_inicio IS NULL 
   OR horario_fim IS NULL 
   OR dias_trabalho IS NULL 
   OR array_length(dias_trabalho, 1) IS NULL;

-- 1.2 Adiciona horários de funcionamento para TODOS os tenants
UPDATE tenants
SET 
    dias_funcionamento = ARRAY[1,2,3,4,5,6], -- Segunda a Sábado
    horario_abertura = '09:00:00',
    horario_fechamento = '18:00:00',
    updated_at = NOW()
WHERE dias_funcionamento IS NULL
   OR array_length(dias_funcionamento, 1) IS NULL;

-- 1.3 Garante que todos os tenants tenham configurações
INSERT INTO tenant_settings (
    tenant_id,
    mensagem_boas_vindas,
    termos_servico,
    politica_privacidade,
    intervalo_agendamento,
    antecedencia_minima_horas,
    created_at,
    updated_at
)
SELECT 
    t.id,
    'Bem-vindo! Agende seu horário facilmente.',
    'Termos de serviço.',
    'Política de privacidade.',
    30,
    2,
    NOW(),
    NOW()
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_settings ts WHERE ts.tenant_id = t.id
);

DO $$ 
BEGIN
    RAISE NOTICE '✅ PARTE 1 CONCLUÍDA: Horários configurados para todas as barbearias!';
END $$;

-- ══════════════════════════════════════════════════════════════════
-- PARTE 2: ADICIONA MÉTODO DE PAGAMENTO
-- ══════════════════════════════════════════════════════════════════

DO $$ 
BEGIN
    RAISE NOTICE '🔧 PARTE 2/3: Adicionando método de pagamento...';
END $$;

-- 2.1 Adiciona coluna metodo_pagamento na tabela agendamentos
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT DEFAULT 'dinheiro' 
CHECK (metodo_pagamento IN ('dinheiro', 'pix', 'cartao'));

-- 2.2 Adiciona comentário explicativo
COMMENT ON COLUMN agendamentos.metodo_pagamento IS 'Payment method: dinheiro (cash), pix, or cartao (card)';

DO $$ 
BEGIN
    RAISE NOTICE '✅ PARTE 2 CONCLUÍDA: Método de pagamento adicionado!';
END $$;

-- ══════════════════════════════════════════════════════════════════
-- PARTE 3: ATUALIZA FUNÇÃO DE CRIAÇÃO DE NOVAS BARBEARIAS
-- ══════════════════════════════════════════════════════════════════

DO $$ 
BEGIN
    RAISE NOTICE '🔧 PARTE 3/3: Atualizando função de criação de barbearias...';
END $$;

-- 3.1 Recria a função create_new_tenant_wizard com horários incluídos
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
    -- Cria o tenant com horários de funcionamento
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

    -- Obtém o ID do usuário autenticado
    SELECT auth.uid() INTO new_user_id;
    
    IF new_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Cria role de admin para o usuário
    INSERT INTO public.user_roles (user_id, tenant_id, role, created_at)
    VALUES (new_user_id, new_tenant_id, 'admin', NOW())
    ON CONFLICT (user_id) DO UPDATE SET 
        tenant_id = new_tenant_id, 
        role = 'admin';

    -- Cria perfil do funcionário com horários de trabalho
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

    -- Cria serviços padrão
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

    -- Cria configurações do tenant
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

    -- Retorna sucesso
    RETURN jsonb_build_object(
        'success', true, 
        'tenant_id', new_tenant_id,
        'message', 'Tenant created successfully'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', SQLERRM,
            'message', 'Failed to create tenant'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.2 Garante permissões de execução
GRANT EXECUTE ON FUNCTION public.create_new_tenant_wizard TO authenticated;

DO $$ 
BEGIN
    RAISE NOTICE '✅ PARTE 3 CONCLUÍDA: Função atualizada!';
END $$;

-- ══════════════════════════════════════════════════════════════════
-- 🎉 FINALIZAÇÃO
-- ══════════════════════════════════════════════════════════════════

DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  ✅ SUCESSO! TODAS AS CORREÇÕES APLICADAS               ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Horários configurados: 9h-18h, Segunda a Sábado';
    RAISE NOTICE '✅ Método de pagamento: Dinheiro/Pix/Cartão';
    RAISE NOTICE '✅ Novas barbearias: Criadas automaticamente com horários';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 PRÓXIMOS PASSOS:';
    RAISE NOTICE '   1. Recarregue o app (Ctrl + Shift + R)';
    RAISE NOTICE '   2. Teste o agendamento - horários devem aparecer!';
    RAISE NOTICE '   3. Teste finalizar serviço - método de pagamento OK!';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'Sistema 100% funcional para TODAS as barbearias! 🚀';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
