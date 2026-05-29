-- Remove the existing overly permissive policy that allows public access to client data
DROP POLICY IF EXISTS "Permitir acesso completo aos clientes" ON public.clientes;

-- Create proper RLS policies that restrict access to authenticated users only
CREATE POLICY "Authenticated users can view clientes" 
ON public.clientes 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create clientes" 
ON public.clientes 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update clientes" 
ON public.clientes 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete clientes" 
ON public.clientes 
FOR DELETE 
TO authenticated
USING (true);