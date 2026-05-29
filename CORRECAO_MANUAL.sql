-- CORREÇÃO MANUAL PARA O USUÁRIO ESPECÍFICO
-- Execute este SQL para corrigir o usuário d1b265b8-225f-4bf4-ad64-1ca11c4beb0d

-- 1. Verificar se já existe tenant para este usuário
SELECT id, nome, slug FROM tenants ORDER BY created_at DESC LIMIT 5;

-- 2. Se não existir, criar um tenant manualmente
INSERT INTO public.tenants (
    id, nome, slug, plano, status, cor_primaria, cor_secundaria, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Barbearia Teste Manual',
    'barbearia-teste-manual',
    'free',
    'active',
    '#000000',
    '#FFD700',
    NOW(),
    NOW()
) RETURNING id;

-- 3. Associar o usuário como admin
-- Substitua XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX pelo ID retornado acima
INSERT INTO public.user_roles (user_id, tenant_id, role, created_at)
VALUES (
    'd1b265b8-225f-4bf4-ad64-1ca11c4beb0d',
    'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX', -- COLOQUE O ID DO TENANT AQUI
    'admin',
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET 
    role = 'admin',
    tenant_id = 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX';

-- 4. Criar perfil de funcionário
INSERT INTO public.funcionarios (
    nome, email, cargo, nivel_acesso, ativo, user_id, tenant_id, created_at, updated_at
) VALUES (
    'Dono Teste',
    'novabarbearia@teste.com',
    'Administrador',
    'administrador',
    true,
    'd1b265b8-225f-4bf4-ad64-1ca11c4beb0d',
    'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX', -- COLOQUE O ID DO TENANT AQUI
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET 
    tenant_id = 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
    nivel_acesso = 'administrador';

-- 5. Verificação final
SELECT 'Dados criados com sucesso!' as status;
