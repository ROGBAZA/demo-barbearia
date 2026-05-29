-- Verificar se existe o serviço "coooo"
SELECT * FROM public.servicos WHERE nome ILIKE '%coooo%';

-- Remover o serviço "coooo" (case insensitive)
DELETE FROM public.servicos 
WHERE nome ILIKE '%coooo%';

-- Mostrar todos os serviços após remoção
SELECT id, nome, preco, duracao_minutos, categoria, 
       CASE 
         WHEN imagem_url IS NOT NULL THEN 'Com imagem'
         ELSE 'Sem imagem'
       END as status_imagem
FROM public.servicos 
ORDER BY nome;

-- Verificar se há serviços duplicados após remoção
SELECT nome, COUNT(*) as quantidade 
FROM public.servicos 
GROUP BY nome 
HAVING COUNT(*) > 1;
