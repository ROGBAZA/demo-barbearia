-- Script final para remover duplicados e adicionar imagens faltantes
-- Execute este script para resolver os problemas de serviços duplicados e imagens faltantes

-- 1. Verificar serviços duplicados antes da remoção
SELECT 'ANTES DA LIMPEZA - Serviços duplicados:' as info;
SELECT nome, COUNT(*) as quantidade, GROUP_CONCAT(id) as ids_duplicados 
FROM public.servicos 
GROUP BY nome 
HAVING COUNT(*) > 1;

-- 2. Remover duplicados mantendo apenas o mais recente (baseado no ID maior)
WITH servicos_duplicados AS (
  SELECT id, nome,
         ROW_NUMBER() OVER (PARTITION BY nome ORDER BY id DESC) as row_num
  FROM public.servicos
)
DELETE FROM public.servicos 
WHERE id IN (
  SELECT id FROM servicos_duplicados WHERE row_num > 1
);

-- 3. Verificar duplicados após a remoção
SELECT 'APÓS LIMPEZA - Verificando se ainda há duplicados:' as info;
SELECT nome, COUNT(*) as quantidade 
FROM public.servicos 
GROUP BY nome 
HAVING COUNT(*) > 1;

-- 4. Adicionar colunas se não existirem
ALTER TABLE public.servicos 
ADD COLUMN IF NOT EXISTS imagem_url TEXT,
ADD COLUMN IF NOT EXISTS descricao TEXT,
ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'corte';

-- 5. Atualizar todos os serviços com imagens de alta qualidade e descriptions
UPDATE public.servicos SET 
  imagem_url = 'https://images.unsplash.com/photo-1503951914875-aa227a94f3c2?w=400&h=300&fit=crop&crop=face',
  descricao = 'Corte de cabelo masculino tradicional com tesoura e máquina',
  categoria = 'corte'
WHERE nome IN ('Corte Masculino', 'Corte de Cabelo Masculino') AND imagem_url IS NULL;

UPDATE public.servicos SET 
  imagem_url = 'https://images.unsplash.com/photo-1581349533516-53887d42a6a1?w=400&h=300&fit=crop&crop=face',
  descricao = 'Barba feita com navalha e produtos de qualidade',
  categoria = 'barba'
WHERE nome = 'Barba' AND imagem_url IS NULL;

UPDATE public.servicos SET 
  imagem_url = 'https://images.unsplash.com/photo-1517891905240-472988babdf9?w=400&h=300&fit=crop&crop=face',
  descricao = 'Pacote completo com corte e barba com desconto especial',
  categoria = 'combo'
WHERE nome IN ('Corte + Barba', 'Corte e Barba') AND imagem_url IS NULL;

UPDATE public.servicos SET 
  imagem_url = 'https://images.unsplash.com/photo-1589881796724-75c8e0d9064c?w=400&h=300&fit=crop&crop=face',
  descricao = 'Design e correção de sobrancelha masculina com técnicas modernas',
  categoria = 'sobrancelha'
WHERE nome = 'Sobrancelha' AND imagem_url IS NULL;

UPDATE public.servicos SET 
  imagem_url = 'https://images.unsplash.com/photo-1622286342621-4a782e274c71?w=400&h=300&fit=crop&crop=face',
  descricao = 'Descolorização completa e platinado com produtos profissionais',
  categoria = 'coloracao'
WHERE nome = 'Platinado' AND imagem_url IS NULL;

UPDATE public.servicos SET 
  imagem_url = 'https://images.unsplash.com/photo-1599351431202-1e0f26d0c115?w=400&h=300&fit=crop&crop=face',
  descricao = 'Alisamento progressivo com cosméticos de alta qualidade',
  categoria = 'coloracao'
WHERE nome = 'Progressiva' AND imagem_url IS NULL;

UPDATE public.servicos SET 
  imagem_url = 'https://images.unsplash.com/photo-1560066984-9d8c0d8d5b0c?w=400&h=300&fit=crop&crop=face',
  descricao = 'Tratamento capilar profundo de hidratação e reconstrução',
  categoria = 'tratamento'
WHERE nome = 'Hidratação' AND imagem_url IS NULL;

UPDATE public.servicos SET 
  imagem_url = 'https://images.unsplash.com/photo-1585747860742-0b3e3e0d3d4e?w=400&h=300&fit=crop&crop=face',
  descricao = 'Pigmentação de barba e sobrancelha com técnica de micropigmentação',
  categoria = 'pigmentacao'
WHERE nome = 'Pigmentação' AND imagem_url IS NULL;

-- 6. Inserir serviços que podem estar faltando com imagens
INSERT INTO public.servicos (nome, preco, duracao_minutos, imagem_url, descricao, categoria) 
SELECT 'Corte Degradê', 35.00, 40, 'https://images.unsplash.com/photo-1582093236149-7e7b42c35969?w=400&h=300&fit=crop&crop=face', 'Corte estilo degradê moderno com máquina', 'corte'
WHERE NOT EXISTS (SELECT 1 FROM public.servicos WHERE nome = 'Corte Degradê');

INSERT INTO public.servicos (nome, preco, duracao_minutos, imagem_url, descricao, categoria) 
SELECT 'Tratamento de Barba', 25.00, 30, 'https://images.unsplash.com/photo-1581349533516-53887d42a6a1?w=400&h=300&fit=crop&crop=face', 'Tratamento completo para barba com produtos premium', 'barba'
WHERE NOT EXISTS (SELECT 1 FROM public.servicos WHERE nome = 'Tratamento de Barba');

-- 7. Mostrar resultado final
SELECT 'RESULTADO FINAL - Todos os serviços:' as info;
SELECT id, nome, preco, duracao_minutos, categoria, descricao, 
       CASE 
         WHEN imagem_url IS NOT NULL THEN 'OK'
         ELSE 'FALTANDO'
       END as status_imagem,
       LEFT(imagem_url, 50) as imagem_preview
FROM public.servicos 
ORDER BY nome;

-- 8. Verificar se ainda há serviços sem imagem
SELECT 'SERVIÇOS SEM IMAGEM (devem ser 0):' as info;
SELECT COUNT(*) as servicos_sem_imagem 
FROM public.servicos 
WHERE imagem_url IS NULL OR imagem_url = '';
