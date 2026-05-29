-- Política temporária para permitir acesso completo à tabela funcionarios
-- Isto deve ser removido quando o sistema estiver funcionando corretamente

DROP POLICY IF EXISTS "Admins can manage all funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "Funcionarios can view their own data" ON public.funcionarios;

-- Política temporária: permitir acesso completo a todos os usuários autenticados
CREATE POLICY "Allow full access to authenticated users" 
ON public.funcionarios 
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
