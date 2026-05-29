-- DEBUG: Verificar se os dados foram criados corretamente
-- Execute este SQL para diagnosticar o problema

-- 1. Verificar se a nova barbearia foi criada
SELECT id, nome, slug, created_at 
FROM tenants 
ORDER BY created_at DESC 
LIMIT 3;

-- 2. Verificar user_roles do usuário atual
-- (Substitua USER_ID pelo ID real do usuário)
SELECT ur.user_id, ur.role, ur.tenant_id, t.nome as tenant_nome
FROM user_roles ur
JOIN tenants t ON ur.tenant_id = t.id
WHERE ur.user_id = 'COLOQUE_AQUI_O_USER_ID'
ORDER BY ur.created_at DESC;

-- 3. Verificar funcionários
SELECT f.user_id, f.nome, f.cargo, f.nivel_acesso, f.tenant_id, t.nome as tenant_nome
FROM funcionarios f
JOIN tenants t ON f.tenant_id = t.id
WHERE f.user_id = 'COLOQUE_AQUI_O_USER_ID';

-- 4. Listar todos os usuários recentes para encontrar o ID
SELECT u.id, u.email, u.created_at,
       ur.role,
       t.nome as tenant_nome
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN tenants t ON ur.tenant_id = t.id
ORDER BY u.created_at DESC
LIMIT 5;

-- 5. Verificar se há conflito nas tabelas
SELECT 'user_roles' as tabela, COUNT(*) as total, COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins
FROM user_roles
UNION ALL
SELECT 'funcionarios', COUNT(*), COUNT(CASE WHEN nivel_acesso = 'administrador' THEN 1 END)
FROM funcionarios
WHERE user_id IS NOT NULL;
