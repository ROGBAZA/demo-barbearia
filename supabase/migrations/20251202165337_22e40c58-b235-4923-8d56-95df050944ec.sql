-- Backfill funcionários for existing users that don't have a record
INSERT INTO public.funcionários (user_id, nome, email, cargo, nivel_acesso, tipo_comissao, valor_comissao, ativo)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'nome', u.email),
  u.email,
  COALESCE((u.raw_user_meta_data ->> 'cargo')::cargo_funcionario, 'barbeiro'),
  'funcionario',
  'percentual',
  30,
  true
FROM auth.users u
LEFT JOIN public.funcionários f ON f.user_id = u.id
WHERE f.id IS NULL;

-- Backfill user_roles for existing users that don't have a record
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'funcionario'
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.id IS NULL;