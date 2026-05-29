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

-- Create RPC for getting booked slots without PII
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
  AND a.status IN ('agendado', 'em_andamento');
$$;

-- Update RLS policies for funcionarios based on user level
DROP POLICY IF EXISTS "Employees can view own data" ON public.funcionários;
DROP POLICY IF EXISTS "Admins can view all employees" ON public.funcionários;
DROP POLICY IF EXISTS "Admins can create employees" ON public.funcionários;
DROP POLICY IF EXISTS "Employees can update own basic data" ON public.funcionários;
DROP POLICY IF EXISTS "Admins can update all employees" ON public.funcionários;
DROP POLICY IF EXISTS "Admins can delete employees" ON public.funcionários;

-- New RLS policies for funcionarios
CREATE POLICY "Users can view own data" 
ON public.funcionários 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins and receptionists can view all employees" 
ON public.funcionários 
FOR SELECT 
TO authenticated
USING (current_funcionario_level() IN ('administrador', 'recepcionista'));

CREATE POLICY "Only admins can create employees" 
ON public.funcionários 
FOR INSERT 
TO authenticated
WITH CHECK (current_funcionario_level() = 'administrador');

CREATE POLICY "Users can update own basic data" 
ON public.funcionários 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Only admins can manage all employees" 
ON public.funcionários 
FOR UPDATE 
TO authenticated
USING (current_funcionario_level() = 'administrador');

CREATE POLICY "Only admins can delete employees" 
ON public.funcionários 
FOR DELETE 
TO authenticated
USING (current_funcionario_level() = 'administrador');

-- Update RLS policies for servicos
DROP POLICY IF EXISTS "Permitir acesso completo aos serviços" ON public.servicos;

CREATE POLICY "All authenticated users can view services" 
ON public.servicos 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Only admins can create services" 
ON public.servicos 
FOR INSERT 
TO authenticated
WITH CHECK (current_funcionario_level() = 'administrador');

CREATE POLICY "Only admins can update services" 
ON public.servicos 
FOR UPDATE 
TO authenticated
USING (current_funcionario_level() = 'administrador');

CREATE POLICY "Only admins can delete services" 
ON public.servicos 
FOR DELETE 
TO authenticated
USING (current_funcionario_level() = 'administrador');

-- Update RLS policies for clientes
DROP POLICY IF EXISTS "Authenticated users can create clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can view clientes" ON public.clientes;

CREATE POLICY "All authenticated users can view clients" 
ON public.clientes 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins and receptionists can create clients" 
ON public.clientes 
FOR INSERT 
TO authenticated
WITH CHECK (current_funcionario_level() IN ('administrador', 'recepcionista'));

CREATE POLICY "Admins and receptionists can update clients" 
ON public.clientes 
FOR UPDATE 
TO authenticated
USING (current_funcionario_level() IN ('administrador', 'recepcionista'));

CREATE POLICY "Only admins can delete clients" 
ON public.clientes 
FOR DELETE 
TO authenticated
USING (current_funcionario_level() = 'administrador');

-- Update RLS policies for agendamentos
DROP POLICY IF EXISTS "Admins can manage all agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Funcionarios can create agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Funcionarios can update agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Funcionarios can view all agendamentos" ON public.agendamentos;

CREATE POLICY "All authenticated users can view appointments" 
ON public.agendamentos 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins and receptionists can create appointments" 
ON public.agendamentos 
FOR INSERT 
TO authenticated
WITH CHECK (current_funcionario_level() IN ('administrador', 'recepcionista'));

CREATE POLICY "Admins and receptionists can update appointments" 
ON public.agendamentos 
FOR UPDATE 
TO authenticated
USING (current_funcionario_level() IN ('administrador', 'recepcionista'));

CREATE POLICY "Barbers can update own appointments" 
ON public.agendamentos 
FOR UPDATE 
TO authenticated
USING (funcionario_id = current_funcionario_id());

CREATE POLICY "Only admins can delete appointments" 
ON public.agendamentos 
FOR DELETE 
TO authenticated
USING (current_funcionario_level() = 'administrador');