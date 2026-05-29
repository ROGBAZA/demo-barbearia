-- Fix security issue: Restrict access to funcionários table
-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Admins can manage all funcionarios" ON public.funcionários;
DROP POLICY IF EXISTS "Funcionarios can view their own data" ON public.funcionários;

-- Create restrictive policies for employee data access
-- Employees can only view their own data
CREATE POLICY "Employees can view own data" 
ON public.funcionários 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all employee data
CREATE POLICY "Admins can view all employees" 
ON public.funcionários 
FOR SELECT 
TO authenticated
USING (is_current_user_admin());

-- Only admins can create new employees
CREATE POLICY "Admins can create employees" 
ON public.funcionários 
FOR INSERT 
TO authenticated
WITH CHECK (is_current_user_admin());

-- Employees can update their own data (excluding sensitive fields like nivel_acesso, tipo_comissao, valor_comissao)
-- Admins can update all employee data
CREATE POLICY "Employees can update own basic data" 
ON public.funcionários 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() AND
  -- Prevent employees from changing sensitive fields
  OLD.nivel_acesso = NEW.nivel_acesso AND
  OLD.tipo_comissao = NEW.tipo_comissao AND
  OLD.valor_comissao = NEW.valor_comissao AND
  OLD.cargo = NEW.cargo
);

CREATE POLICY "Admins can update all employees" 
ON public.funcionários 
FOR UPDATE 
TO authenticated
USING (is_current_user_admin());

-- Only admins can delete employees (actually marks as inactive)
CREATE POLICY "Admins can delete employees" 
ON public.funcionários 
FOR DELETE 
TO authenticated
USING (is_current_user_admin());