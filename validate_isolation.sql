-- ============================================
-- SCRIPT DE VALIDAÇÃO DE ISOLAMENTO MULTI-TENANT
-- Execute este script para verificar se o isolamento está funcionando
-- ============================================

-- 1. Verificar se todas as tabelas têm RLS ativado
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ATIVO'
        ELSE '❌ RLS DESATIVADO'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'tenants', 'funcionarios', 'clientes', 'servicos', 
    'agendamentos', 'fila_espera', 'configuracoes', 
    'user_roles', 'planos', 'assinaturas_clientes', 'tenant_settings'
)
ORDER BY tablename;

-- 2. Contar políticas RLS por tabela
SELECT 
    tablename,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 3. Verificar se todas as funções de segurança existem
SELECT 
    routine_name,
    CASE 
        WHEN routine_definition LIKE '%tenant_id%' THEN '✅ FILTRA POR TENANT'
        ELSE '⚠️ SEM FILTRO DE TENANT'
    END as status
FROM information_schema.routines 
WHERE routine_name IN (
    'get_auth_tenant_id', 
    'is_current_user_admin', 
    'current_funcionario_level', 
    'current_funcionario_id'
)
ORDER BY routine_name;

-- 4. Verificar índices de performance
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE '%tenant_id%'
ORDER BY tablename;

-- 5. Contar registros por tenant (para verificar se há dados misturados)
SELECT 
    'clientes' as tabela,
    tenant_id,
    COUNT(*) as total
FROM clientes
GROUP BY tenant_id

UNION ALL

SELECT 
    'funcionarios' as tabela,
    tenant_id,
    COUNT(*) as total
FROM funcionarios
GROUP BY tenant_id

UNION ALL

SELECT 
    'servicos' as tabela,
    tenant_id,
    COUNT(*) as total
FROM servicos
GROUP BY tenant_id

UNION ALL

SELECT 
    'agendamentos' as tabela,
    tenant_id,
    COUNT(*) as total
FROM agendamentos
GROUP BY tenant_id

ORDER BY tabela, tenant_id;

-- 6. Verificar se há funcionários com email duplicado entre tenants
SELECT 
    email,
    COUNT(DISTINCT tenant_id) as num_tenants,
    array_agg(DISTINCT tenant_id) as tenant_ids
FROM funcionarios
GROUP BY email
HAVING COUNT(DISTINCT tenant_id) > 1;

-- 7. Verificar se há clientes com dados duplicados entre tenants
SELECT 
    telefone,
    COUNT(DISTINCT tenant_id) as num_tenants,
    array_agg(DISTINCT tenant_id) as tenant_ids
FROM clientes
WHERE telefone IS NOT NULL
GROUP BY telefone
HAVING COUNT(DISTINCT tenant_id) > 1;

-- 8. Verificar configurações por tenant
SELECT 
    t.nome as barbearia,
    c.nome_barbearia,
    c.cor_primaria,
    c.logo_url IS NOT NULL as tem_logo,
    c.banner_url IS NOT NULL as tem_banner
FROM tenants t
LEFT JOIN configuracoes c ON t.id = c.tenant_id
ORDER BY t.nome;

-- 9. Verificar se todos os tenants têm admin
SELECT 
    t.nome as barbearia,
    COUNT(f.id) as total_admins
FROM tenants t
LEFT JOIN funcionarios f ON t.id = f.tenant_id AND f.nivel_acesso = 'administrador' AND f.ativo = true
GROUP BY t.id, t.nome
ORDER BY t.nome;

-- 10. Verificar integridade referencial
SELECT 
    'agendamentos sem tenant' as problema,
    COUNT(*) as total
FROM agendamentos
WHERE tenant_id IS NULL

UNION ALL

SELECT 
    'clientes sem tenant' as problema,
    COUNT(*) as total
FROM clientes
WHERE tenant_id IS NULL

UNION ALL

SELECT 
    'funcionarios sem tenant' as problema,
    COUNT(*) as total
FROM funcionarios
WHERE tenant_id IS NULL

UNION ALL

SELECT 
    'servicos sem tenant' as problema,
    COUNT(*) as total
FROM servicos
WHERE tenant_id IS NULL;
