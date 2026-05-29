-- 🔧 LIMPEZA E CONSISTÊNCIA DE DADOS MULTI-TENANT
-- Execute este script APÓS executar a função RPC atualizada

-- 1. Limpar user_roles órfãos
DELETE FROM public.user_roles 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- 2. Limpar funcionários órfãos
DELETE FROM public.funcionarios 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- 3. Limpar clientes órfãos
DELETE FROM public.clientes 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- 4. Garantir que todos os funcionários tenham user_role correspondente
INSERT INTO public.user_roles (user_id, tenant_id, role, created_at)
SELECT 
    f.user_id, 
    f.tenant_id, 
    CASE 
        WHEN f.nivel_acesso = 'administrador' THEN 'admin'
        WHEN f.nivel_acesso = 'recepcionista' THEN 'recepcionista'
        ELSE 'funcionario'
    END as role,
    NOW()
FROM public.funcionarios f
WHERE f.user_id IS NOT NULL 
AND f.user_id NOT IN (SELECT user_id FROM public.user_roles WHERE user_id = f.user_id)
ON CONFLICT (user_id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    role = EXCLUDED.role;

-- 5. Verificar integridade dos tenants
SELECT 
    t.id,
    t.nome,
    t.slug,
    COUNT(DISTINCT ur.user_id) as users_with_roles,
    COUNT(DISTINCT f.user_id) as funcionarios,
    COUNT(DISTINCT c.user_id) as clientes
FROM public.tenants t
LEFT JOIN public.user_roles ur ON t.id = ur.tenant_id
LEFT JOIN public.funcionarios f ON t.id = f.tenant_id
LEFT JOIN public.clientes c ON t.id = c.tenant_id
GROUP BY t.id, t.nome, t.slug
ORDER BY t.created_at DESC;

-- 6. Criar tenant default se não existir
INSERT INTO public.tenants (nome, slug, plano, status, cor_primaria, cor_secundaria, created_at, updated_at)
VALUES (
    'Route 66 Default',
    'default',
    'premium',
    'active',
    '#000000',
    '#FFD700',
    NOW(),
    NOW()
) ON CONFLICT (slug) DO NOTHING;

-- 7. Verificar se a função RPC existe
SELECT 
    proname as function_name,
    prosrc as source_code
FROM pg_proc 
WHERE proname = 'create_new_tenant_wizard';
