-- Verificar se a tabela servicos existe e adicionar política temporária
-- Permitir acesso completo à tabela servicos para usuários autenticados

-- Habilitar RLS se não estiver habilitado
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "Permitir acesso completo aos serviços" ON public.servicos;

-- Criar política temporária para acesso completo
CREATE POLICY "Allow full access to servicos" 
ON public.servicos 
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Inserir alguns serviços de exemplo se a tabela estiver vazia
INSERT INTO public.servicos (nome, preco, duracao_minutos) 
SELECT 
  'Corte de Cabelo Masculino', 30.00, 30
WHERE NOT EXISTS (SELECT 1 FROM public.servicos);

INSERT INTO public.servicos (nome, preco, duracao_minutos) 
SELECT 
  'Barba', 20.00, 20
WHERE NOT EXISTS (SELECT 1 FROM public.servicos LIMIT 1);

INSERT INTO public.servicos (nome, preco, duracao_minutos) 
SELECT 
  'Corte + Barba', 45.00, 45
WHERE NOT EXISTS (SELECT 1 FROM public.servicos LIMIT 1);
