-- Rename table to remove accent
ALTER TABLE IF EXISTS public.funcionários RENAME TO funcionarios;

-- Fix the handle_new_user function to use the correct table name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_nome text;
  user_cargo cargo_funcionario;
BEGIN
  -- Get user metadata from signup
  user_nome := COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.email);
  user_cargo := COALESCE((NEW.raw_user_meta_data ->> 'cargo')::cargo_funcionario, 'barbeiro');
  
  -- Create funcionario record
  INSERT INTO public.funcionarios (
    user_id,
    nome,
    email,
    cargo,
    nivel_acesso,
    tipo_comissao,
    valor_comissao,
    ativo
  ) VALUES (
    NEW.id,
    user_nome,
    NEW.email,
    user_cargo,
    'funcionario',
    'percentual',
    30,
    true
  );
  
  -- Create default role (funcionario)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'funcionario');
  
  RETURN NEW;
END;
$$;
