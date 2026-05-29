-- Update RLS policies for funcionarios based on user level
DROP POLICY IF EXISTS "Users can view own data" ON public.funcionários;
DROP POLICY IF EXISTS "Admins and receptionists can view all employees" ON public.funcionários;
DROP POLICY IF EXISTS "Only admins can create employees" ON public.funcionários;
DROP POLICY IF EXISTS "Users can update own basic data" ON public.funcionários;
DROP POLICY IF EXISTS "Only admins can manage all employees" ON public.funcionários;
DROP POLICY IF EXISTS "Only admins can delete employees" ON public.funcionários;

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
DROP POLICY IF EXISTS "All authenticated users can view services" ON public.servicos;
DROP POLICY IF EXISTS "Only admins can create services" ON public.servicos;
DROP POLICY IF EXISTS "Only admins can update services" ON public.servicos;
DROP POLICY IF EXISTS "Only admins can delete services" ON public.servicos;

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
DROP POLICY IF EXISTS "All authenticated users can view clients" ON public.clientes;
DROP POLICY IF EXISTS "Admins and receptionists can create clients" ON public.clientes;
DROP POLICY IF EXISTS "Admins and receptionists can update clients" ON public.clientes;
DROP POLICY IF EXISTS "Only admins can delete clients" ON public.clientes;

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
DROP POLICY IF EXISTS "All authenticated users can view appointments" ON public.agendamentos;
DROP POLICY IF EXISTS "Admins and receptionists can create appointments" ON public.agendamentos;
DROP POLICY IF EXISTS "Admins and receptionists can update appointments" ON public.agendamentos;
DROP POLICY IF EXISTS "Barbers can update own appointments" ON public.agendamentos;
DROP POLICY IF EXISTS "Only admins can delete appointments" ON public.agendamentos;

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