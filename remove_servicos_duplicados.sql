-- Verificar serviços duplicados
SELECT nome, COUNT(*) as quantidade, GROUP_CONCAT(id) as ids_duplicados 
FROM public.servicos 
GROUP BY nome 
HAVING COUNT(*) > 1;

-- Remover duplicados mantendo apenas o mais recente
WITH servicos_duplicados AS (
  SELECT id, nome, created_at,
         ROW_NUMBER() OVER (PARTITION BY nome ORDER BY created_at DESC) as row_num
  FROM public.servicos
)
DELETE FROM public.servicos 
WHERE id IN (
  SELECT id FROM servicos_duplicados WHERE row_num > 1
);

-- Atualizar serviços com imagens melhores e mais específicas
UPDATE public.servicos SET 
  imagem_url = 'https://images.unsplash.com/photo-1585747860742-0b3e3e0d3d4e?w=400&h=300&fit=crop&crop=face',
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

-- Mostrar serviços atualizados
SELECT id, nome, preco, duracao_minutos, categoria, descricao, LEFT(imagem_url, 50) as imagem_preview
FROM public.servicos 
ORDER BY nome;
