-- FIX ALL EXISTING BARBERS: Add default working hours and days
-- This will fix ALL barbershops that don't have time slots showing

-- 1. Add default working hours to ALL funcionarios that don't have them
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

-- 2. Add default operating hours to ALL tenants
UPDATE tenants
SET 
    dias_funcionamento = ARRAY[1,2,3,4,5,6], -- Segunda a Sábado
    horario_abertura = '09:00:00',
    horario_fechamento = '18:00:00',
    updated_at = NOW()
WHERE dias_funcionamento IS NULL
   OR array_length(dias_funcionamento, 1) IS NULL;

-- 3. Ensure tenant_settings exist for all tenants
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

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Success! All barbershops now have default working hours configured.';
    RAISE NOTICE 'Hours: Monday-Saturday, 9AM-6PM';
    RAISE NOTICE 'Time slots should now appear in the booking system!';
END $$;
