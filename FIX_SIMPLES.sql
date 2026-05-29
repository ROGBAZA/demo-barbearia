-- SOLUÇÃO DINÂMICA - RESPEITA AS CONFIGURAÇÕES DE CADA NEGÓCIO
-- Adiciona colunas se não existirem
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS dias_funcionamento INTEGER[];
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS horario_abertura TIME;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS horario_fechamento TIME;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT DEFAULT 'dinheiro' CHECK (metodo_pagamento IN ('dinheiro', 'pix', 'cartao'));

-- Garante que todos os tenants tenham tenant_settings (onde ficam as horas configuradas)
INSERT INTO tenant_settings (tenant_id, horario_abertura, horario_fechamento, dias_funcionamento)
SELECT id, '09:00', '18:00', ARRAY[1,2,3,4,5,6]
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM tenant_settings ts WHERE ts.tenant_id = t.id)
ON CONFLICT DO NOTHING;

-- Configura os funcionários com o horário do NEGÓCIO deles, se estiverem vazios
UPDATE funcionarios f
SET 
    horario_inicio = COALESCE(ts.horario_abertura, '09:00'),
    horario_fim = COALESCE(ts.horario_fechamento, '18:00'),
    dias_trabalho = COALESCE(ts.dias_funcionamento, ARRAY[1,2,3,4,5,6])
FROM tenant_settings ts
WHERE f.tenant_id = ts.tenant_id
AND (f.horario_inicio IS NULL OR f.horario_fim IS NULL OR f.dias_trabalho IS NULL);

-- Cria RPC pública para pegar configurações (Necessário para o Agendamento)
DROP FUNCTION IF EXISTS public.get_public_config(UUID);

CREATE OR REPLACE FUNCTION public.get_public_config(t_id UUID)
RETURNS TABLE (
    id UUID,
    nome_barbearia TEXT,
    endereco TEXT,
    telefone TEXT,
    email TEXT,
    logo_url TEXT,
    banner_url TEXT,
    horario_abertura TIME,
    horario_fechamento TIME,
    dias_funcionamento INTEGER[]
) 
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        ts.id,
        ts.nome_barbearia,
        ts.endereco,
        ts.telefone,
        ts.email,
        t.logo_url,
        t.banner_url,
        ts.horario_abertura,
        ts.horario_fechamento,
        ts.dias_funcionamento
    FROM tenant_settings ts
    JOIN tenants t ON ts.tenant_id = t.id
    WHERE ts.tenant_id = t_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_config(UUID) TO anon, authenticated, service_role;

-- 4. RPC: get_or_create_client_public (Seguro para o Agendamento)
CREATE OR REPLACE FUNCTION public.get_or_create_client_public(
    p_tenant_id UUID,
    p_nome TEXT,
    p_telefone TEXT,
    p_email TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_cliente_id UUID;
BEGIN
    -- 1. Tenta encontrar por user_id se fornecido
    IF p_user_id IS NOT NULL THEN
        SELECT id INTO v_cliente_id FROM public.clientes 
        WHERE user_id = p_user_id AND tenant_id = p_tenant_id LIMIT 1;
    END IF;

    -- 2. Se não encontrou, tenta por telefone + tenant
    IF v_cliente_id IS NULL THEN
        SELECT id INTO v_cliente_id FROM public.clientes 
        WHERE telefone = p_telefone AND tenant_id = p_tenant_id LIMIT 1;
    END IF;

    -- 3. Se ainda não encontrou, cria novo
    IF v_cliente_id IS NULL THEN
        INSERT INTO public.clientes (tenant_id, nome, telefone, email, user_id)
        VALUES (p_tenant_id, p_nome, p_telefone, p_email, p_user_id)
        RETURNING id INTO v_cliente_id;
    ELSE
        -- Atualiza email/user_id se necessário
        UPDATE public.clientes SET
            email = COALESCE(email, p_email),
            user_id = COALESCE(user_id, p_user_id)
        WHERE id = v_cliente_id;
    END IF;

    RETURN v_cliente_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: create_agendamento_public
CREATE OR REPLACE FUNCTION public.create_agendamento_public(
    p_tenant_id UUID,
    p_cliente_id UUID,
    p_servico_id UUID,
    p_funcionario_id UUID,
    p_data_hora TIMESTAMPTZ,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_agendamento_id UUID;
BEGIN
    INSERT INTO public.agendamentos (
        tenant_id, cliente_id, servico_id, funcionario_id, 
        data_hora, status, observacoes, created_at, updated_at
    ) VALUES (
        p_tenant_id, p_cliente_id, p_servico_id, p_funcionario_id, 
        p_data_hora, 'agendado', p_observacoes, NOW(), NOW()
    )
    RETURNING id INTO v_agendamento_id;

    RETURN v_agendamento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_or_create_client_public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_agendamento_public TO anon, authenticated, service_role;

-- Pronto. Versão completa para todas as barbearias.


