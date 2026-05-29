-- DEBUG: Verificar dados do usuário criado recentemente
-- Execute este SQL no Supabase para diagnosticar o problema

-- 1. Verificar se a função RPC foi criada
SELECT proname FROM pg_proc WHERE proname = 'create_new_tenant_wizard';

-- 2. Verificar tenants criados recentemente
SELECT id, nome, slug, plano, status, created_at 
FROM tenants 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Verificar user_roles (AQUI ESTÁ O PROVÁVEL PROBLEMA)
SELECT ur.user_id, ur.role, ur.tenant_id, t.nome as tenant_nome, u.email
FROM user_roles ur
JOIN tenants t ON ur.tenant_id = t.id
JOIN auth.users u ON ur.user_id = u.id
ORDER BY ur.created_at DESC
LIMIT 10;

-- 4. Verificar funcionários
SELECT f.user_id, f.nome, f.cargo, f.nivel_acesso, f.tenant_id, t.nome as tenant_nome
FROM funcionarios f
JOIN tenants t ON f.tenant_id = t.id
WHERE f.user_id IS NOT NULL
ORDER BY f.created_at DESC
LIMIT 10;

-- 5. Verificar clientes (para ver se novos donos estão aqui erroneamente)
SELECT c.user_id, c.nome, c.email, c.tenant_id, t.nome as tenant_nome
FROM clientes c
JOIN tenants t ON c.tenant_id = t.id
WHERE c.user_id IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 10;

-- 6. Verificar se há usuários sem role definida
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL
ORDER BY u.created_at DESC
LIMIT 10;
