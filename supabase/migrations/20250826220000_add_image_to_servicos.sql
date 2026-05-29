-- Adicionar campo de imagem na tabela de serviços
ALTER TABLE public.servicos 
ADD COLUMN imagem_url TEXT,
ADD COLUMN descricao TEXT,
ADD COLUMN categoria TEXT DEFAULT 'corte';

-- Atualizar serviços existentes com imagens de exemplo
UPDATE public.servicos SET 
  imagem_url = 'https://images.unsplash.com/photo-1503951914875-aa227a94f3c2?w=400&h=300&fit=crop&crop=face',
  descricao = 'Corte de cabelo masculino tradicional com tesoura e máquina',
  categoria = 'corte'
WHERE nome = 'Corte Masculino';

UPDATE public.servicos SET 
  imagem_url = 'https://images.unsplash.com/photo-1581349533516-53887d42a6a1?w=400&h=300&fit=crop&crop=face',
  descricao = 'Barba feita com navalha e produtos de qualidade',
  categoria = 'barba'
WHERE nome = 'Barba';

UPDATE public.servicos SET 
  imagem_url = 'https://images.unsplash.com/photo-1517891905240-472988babdf9?w=400&h=300&fit=crop&crop=face',
  descricao = 'Pacote completo com corte e barba',
  categoria = 'combo'
WHERE nome = 'Corte + Barba';

UPDATE public.servicos SET 
  imagem_url = 'https://images.unsplash.com/photo-1589881796724-75c8e0d9064c?w=400&h=300&fit=crop&crop=face',
  descricao = 'Design e correção de sobrancelha masculina',
  categoria = 'sobrancelha'
WHERE nome = 'Sobrancelha';

-- Adicionar novos serviços com imagens
INSERT INTO public.servicos (nome, preco, duracao_minutos, imagem_url, descricao, categoria) VALUES 
('Platinado', 80.00, 60, 'https://images.unsplash.com/photo-1622286342621-4a782e274c71?w=400&h=300&fit=crop&crop=face', 'Descolorização e platinado completo', 'coloracao'),
('Progressiva', 120.00, 90, 'https://images.unsplash.com/photo-1599351431202-1e0f26d0c115?w=400&h=300&fit=crop&crop=face', 'Alisamento progressivo com produtos profissionais', 'coloracao'),
('Hidratação', 40.00, 30, 'https://images.unsplash.com/photo-1560066984-9d8c0d8d5b0c?w=400&h=300&fit=crop&crop=face', 'Tratamento de hidratação profunda', 'tratamento'),
('Pigmentação', 50.00, 40, 'https://images.unsplash.com/photo-1585747860742-0b3e3e0d3d4e?w=400&h=300&fit=crop&crop=face', 'Pigmentação de barba e sobrancelha', 'pigmentacao');
