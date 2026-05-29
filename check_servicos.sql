-- Verificação adicional para garantir que serviços estão acessíveis
-- Execute este SQL se os serviços ainda não aparecerem

-- Verificar se há serviços na tabela
SELECT COUNT(*) as total_servicos FROM public.servicos;

-- Se não houver serviços, inserir dados de exemplo
INSERT INTO public.servicos (nome, preco, duracao_minutos) VALUES
  ('Corte de Cabelo Masculino', 30.00, 30),
  ('Barba', 20.00, 20),
  ('Corte + Barba', 45.00, 45),
  ('Corte Degradê', 35.00, 40),
  ('Tratamento de Barba', 25.00, 30);

-- Verificar se as políticas estão corretas
DROP POLICY IF EXISTS "Allow full access to servicos" ON public.servicos;
CREATE POLICY "Allow full access to servicos" 
ON public.servicos 
FOR ALL 
USING (true)
WITH CHECK (true); -- Permitir acesso total (temporário)
