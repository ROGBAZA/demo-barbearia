-- Create a function to promote the first user to admin (run once after first signup)
CREATE OR REPLACE FUNCTION public.promote_first_user_to_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  first_user_id uuid;
  first_funcionario_id uuid;
BEGIN
  -- Get the first user
  SELECT id INTO first_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    -- Update user_roles to admin
    UPDATE public.user_roles 
    SET role = 'admin' 
    WHERE user_id = first_user_id;
    
    -- If no role exists, create one
    INSERT INTO public.user_roles (user_id, role)
    VALUES (first_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Update funcionario to administrador
    UPDATE public.funcionários 
    SET nivel_acesso = 'administrador' 
    WHERE user_id = first_user_id;
    
    RAISE NOTICE 'First user promoted to admin: %', first_user_id;
  END IF;
END;
$$;

-- Also create a manual function to promote any user to admin by email (for owner use)
CREATE OR REPLACE FUNCTION public.promote_user_to_admin_by_email(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get the user by email
  SELECT id INTO target_user_id FROM auth.users WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RETURN 'User not found with email: ' || user_email;
  END IF;
  
  -- Update or insert role to admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO UPDATE SET role = 'admin';
  
  -- Update funcionario to administrador
  UPDATE public.funcionários 
  SET nivel_acesso = 'administrador' 
  WHERE user_id = target_user_id OR email = user_email;
  
  RETURN 'User promoted to admin: ' || user_email;
END;
$$;