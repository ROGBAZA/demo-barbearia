-- Remove políticas RLS permissivas conflitantes da tabela clientes
DROP POLICY IF EXISTS "Authenticated users can delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can create clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can view clientes" ON public.clientes;