-- Secure RPCs for Public Access with Tenant Isolation

-- 1. get_public_barbeiros with tenant filtering
CREATE OR REPLACE FUNCTION public.get_public_barbeiros(t_id UUID)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  cargo cargo_funcionario,
  horario_inicio TIME,
  horario_fim TIME,
  dias_trabalho INTEGER[],
  foto_url TEXT
)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    f.id,
    f.nome,
    f.cargo,
    f.horario_inicio,
    f.horario_fim,
    f.dias_trabalho,
    f.foto_url
  FROM public.funcionarios f 
  WHERE f.ativo = true 
  AND f.cargo = 'barbeiro'
  AND f.tenant_id = t_id;
$$;

-- 2. get_public_servicos with tenant filtering
CREATE OR REPLACE FUNCTION public.get_public_servicos(t_id UUID)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  preco NUMERIC,
  duracao_minutos INTEGER,
  descricao TEXT,
  imagem_url TEXT,
  categoria TEXT
)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.nome,
    s.preco,
    s.duracao_minutos,
    s.descricao,
    s.imagem_url,
    s.categoria
  FROM public.servicos s
  WHERE s.ativo = true 
  AND s.tenant_id = t_id
  ORDER BY s.nome ASC;
$$;

-- 3. get_booked_slots (Ensure it returns duracao_minutos)
-- This function relies on funcionario_id which implicitly isolates tenant, but strictly speaking
-- we assume the caller knows the correct funcionario_id.
CREATE OR REPLACE FUNCTION public.get_booked_slots(
  funcionario_uuid UUID,
  data_inicio DATE,
  data_fim DATE
)
RETURNS TABLE (
  data_hora TIMESTAMP WITH TIME ZONE,
  duracao_minutos INTEGER
)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    a.data_hora,
    s.duracao_minutos
  FROM public.agendamentos a
  JOIN public.servicos s ON a.servico_id = s.id
  WHERE a.funcionario_id = funcionario_uuid
  AND a.data_hora::date BETWEEN data_inicio AND data_fim
  AND a.status = 'agendado';
$$;

-- Grant permissions to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_public_barbeiros(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_servicos(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_booked_slots(UUID, DATE, DATE) TO anon, authenticated, service_role;
