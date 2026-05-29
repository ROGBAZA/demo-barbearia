-- =====================================================
-- HABILITAR REALTIME PARA NOTIFICAÇÕES
-- =====================================================
-- Execute este script no Supabase SQL Editor APÓS criar a tabela notificacoes

-- 1. Adicionar a tabela notificacoes à publicação do Realtime
ALTER publication supabase_realtime ADD TABLE notificacoes;

-- 2. Verificar se foi adicionado corretamente
SELECT 
    schemaname, 
    tablename 
FROM 
    pg_publication_tables 
WHERE 
    pubname = 'supabase_realtime';

-- 3. Você deve ver 'notificacoes' na lista
-- Se não aparecer, tente:
-- DROP publication IF EXISTS supabase_realtime;
-- CREATE publication supabase_realtime FOR ALL TABLES;
