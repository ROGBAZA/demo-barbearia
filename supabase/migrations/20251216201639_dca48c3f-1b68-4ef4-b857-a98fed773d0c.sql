
-- Insert funcionário record for roger_bazan15@hotmail.com
INSERT INTO public.funcionários (
  user_id,
  nome,
  email,
  cargo,
  nivel_acesso,
  tipo_comissao,
  valor_comissao,
  ativo
) VALUES (
  '0cfe08cb-2851-4ed4-9e91-c0649ce1d741',
  'Roger Bazan',
  'roger_bazan15@hotmail.com',
  'gerente',
  'administrador',
  'percentual',
  30,
  true
)
ON CONFLICT DO NOTHING;

-- Update user_roles to admin
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = '0cfe08cb-2851-4ed4-9e91-c0649ce1d741';

-- If no role exists, insert admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('0cfe08cb-2851-4ed4-9e91-c0649ce1d741', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
