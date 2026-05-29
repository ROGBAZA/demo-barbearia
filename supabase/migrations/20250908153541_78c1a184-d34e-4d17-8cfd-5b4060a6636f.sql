-- Add recepcionista to nivel_acesso enum
ALTER TYPE nivel_acesso ADD VALUE 'recepcionista';

-- Add logo and banner columns to configuracoes table
ALTER TABLE public.configuracoes 
ADD COLUMN logo_url TEXT,
ADD COLUMN banner_url TEXT;

-- Add schedule columns to funcionarios table
ALTER TABLE public.funcionários 
ADD COLUMN horario_inicio TIME DEFAULT '08:00:00',
ADD COLUMN horario_fim TIME DEFAULT '18:00:00',
ADD COLUMN dias_trabalho INTEGER[] DEFAULT '{1,2,3,4,5,6}';

-- Create storage bucket for branding
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true);

-- Create policies for branding bucket
CREATE POLICY "Public can view branding files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'branding');

CREATE POLICY "Admins can upload branding files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'branding' AND is_current_user_admin());

CREATE POLICY "Admins can update branding files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'branding' AND is_current_user_admin());

-- Create function to get current funcionario id
CREATE OR REPLACE FUNCTION public.current_funcionario_id()
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.funcionários WHERE user_id = auth.uid() AND ativo = true;
$$;

-- Create function to get current funcionario level
CREATE OR REPLACE FUNCTION public.current_funcionario_level()
RETURNS TEXT
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nivel_acesso::text FROM public.funcionários WHERE user_id = auth.uid() AND ativo = true;
$$;

-- Create RPC for public barbeiros (without sensitive data)
CREATE OR REPLACE FUNCTION public.get_public_barbeiros()
RETURNS TABLE (
  id UUID,
  nome TEXT,
  cargo cargo_funcionario,
  horario_inicio TIME,
  horario_fim TIME,
  dias_trabalho INTEGER[]
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
    f.dias_trabalho
  FROM public.funcionários f 
  WHERE f.ativo = true 
  AND f.cargo = 'barbeiro';
$$;

-- Create RPC for getting booked slots without PII (using correct enum values)
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