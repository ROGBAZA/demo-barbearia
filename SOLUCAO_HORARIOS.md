# 🎯 SOLUÇÃO DEFINITIVA - HORÁRIOS DE AGENDAMENTO

## 🔥 PROBLEMA RESOLVIDO

**Causa raiz:** Barbeiros e barbearias criados **SEM horários de trabalho configurados** no banco de dados.

**Solução:** 3 SQLs que corrigem:
1. ✅ **Todas as barbearias EXISTENTES** (inclusive as suas)
2. ✅ **Todas as barbearias FUTURAS** (que ainda serão criadas)
3. ✅ **Sistema de pagamentos** (metodo_pagamento)

---

## 📋 EXECUTE AS 3 SQLs AGORA (5 minutos)

### 🌐 Onde Executar:
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)
4. Clique em **New Query**

---

### SQL 1️⃣: CORRIGE TODAS AS BARBEARIAS EXISTENTES

**O que faz:** Adiciona horários padrão (9h-18h, Segunda-Sábado) para TODOS os barbeiros e barbearias que existem agora.

```sql
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
```

**Clique em RUN** ✅

---

### SQL 2️⃣: ADICIONA MÉTODO DE PAGAMENTO

**O que faz:** Permite salvar a forma de pagamento (Dinheiro/Pix/Cartão) ao finalizar serviços.

```sql
-- Add metodo_pagamento column to agendamentos table
-- This field is required for tracking payment methods in completed services

ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT DEFAULT 'dinheiro' 
CHECK (metodo_pagamento IN ('dinheiro', 'pix', 'cartao'));

-- Add comment to explain the column
COMMENT ON COLUMN agendamentos.metodo_pagamento IS 'Payment method used for the appointment: dinheiro (cash), pix, or cartao (card)';
```

**Clique em RUN** ✅

---

### SQL 3️⃣: CORRIGE CRIAÇÃO DE NOVAS BARBEARIAS

**O que faz:** Garante que TODAS as barbearias criadas no futuro já terão horários configurados automaticamente.

```sql
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
```

**Clique em RUN** ✅

---

## ✅ TESTE AGORA (2 minutos)

### Passo 1: Recarregue o App
- Pressione **Ctrl + Shift + R** na página do agendamento

### Passo 2: Teste o Agendamento
1. Selecione um **serviço**
2. Selecione um **barbeiro**
3. Selecione uma **data** (hoje ou amanhã)
4. **Horários devem aparecer agora!** 🎉

### Passo 3: Verifique no Console (Opcional)
- Pressione **F12**
- Vá na aba **Console**
- Veja os logs coloridos mostrando:
  - ✅ "Slots gerados: X"
  - ✅ "Horário de expediente: 09:00 → 18:00"

---

## 🎯 RESULTADO FINAL

### ✅ O QUE FOI CORRIGIDO:

1. **Todas as barbearias EXISTENTES:**
   - Horários: 9h - 18h
   - Dias: Segunda a Sábado
   - Intervalo: 30 minutos

2. **Todas as barbearias FUTURAS:**
   - Já criadas com horários configurados
   - Funcionários já têm agenda completa
   - Sistema funciona imediatamente após criação

3. **Sistema de Pagamentos:**
   - Coluna `metodo_pagamento` criada
   - Opções: Dinheiro, Pix, Cartão
   - Relatórios financeiros completos

---

## 🔧 PERSONALIZAÇÃO (OPCIONAL)

### Alterar Horários Padrão:
```sql
-- Exemplo: Mudar para 8h-20h
UPDATE funcionarios SET horario_inicio = '08:00:00', horario_fim = '20:00:00';
UPDATE tenants SET horario_abertura = '08:00:00', horario_fechamento = '20:00:00';
```

### Adicionar Domingo:
```sql
-- Adicionar domingo (7) aos dias de trabalho
UPDATE funcionarios SET dias_trabalho = ARRAY[1,2,3,4,5,6,7];
UPDATE tenants SET dias_funcionamento = ARRAY[1,2,3,4,5,6,7];
```

---

## 🆘 TROUBLESHOOTING

### Ainda não aparecem horários?
1. Verifique se executou as 3 SQLs
2. Recarregue com **Ctrl + Shift + R**
3. Aguarde 30 segundos (cache do Supabase)
4. Abra o console (F12) e veja os logs

### Horários errados?
- Configure manualmente em: **Configurações → Funcionários → Editar → Horários**

---

**Tempo estimado:** 5 minutos
**Resultado:** Horários funcionando em **TODAS** as barbearias ✅
