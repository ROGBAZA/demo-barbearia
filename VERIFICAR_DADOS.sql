-- VERIFICAR DADOS DO USUÁRIO: d1b265b8-225f-4bf4-ad64-1ca11c4beb0d

-- 1. Verificar se o tenant foi criado
SELECT id, nome, slug, created_at 
FROM tenants 
WHERE id IN (
    SELECT tenant_id FROM user_roles WHERE user_id = 'd1b265b8-225f-4bf4-ad64-1ca11c4beb0d'
    UNION
    SELECT tenant_id FROM funcionarios WHERE user_id = 'd1b265b8-225f-4bf4-ad64-1ca11c4beb0d'
);

-- 2. Verificar user_role
SELECT * FROM user_roles WHERE user_id = 'd1b265b8-225f-4bf4-ad64-1ca11c4beb0d';

-- 3. Verificar funcionário
SELECT * FROM funcionarios WHERE user_id = 'd1b265b8-225f-4bf4-ad64-1ca11c4beb0d';

-- 4. Verificar cliente
SELECT * FROM clientes WHERE user_id = 'd1b265b8-225f-4bf4-ad64-1ca11c4beb0d';

-- 5. Verificar todos os dados do usuário
SELECT 
    u.id as user_id,
    u.email,
    ur.role as user_role,
    ur.tenant_id as role_tenant_id,
    f.nome as func_nome,
    f.cargo as func_cargo,
    f.nivel_acesso as func_nivel,
    f.tenant_id as func_tenant_id,
    c.nome as cliente_nome,
    c.tenant_id as cliente_tenant_id
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN funcionarios f ON u.id = f.user_id
LEFT JOIN clientes c ON u.id = c.user_id
WHERE u.id = 'd1b265b8-225f-4bf4-ad64-1ca11c4beb0d';
