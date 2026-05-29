-- Add 'gerente' to cargo_funcionario enum
ALTER TYPE public.cargo_funcionario ADD VALUE IF NOT EXISTS 'gerente';

-- Create user role enum for secure role management
CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'recepcionista', 'funcionario');

-- Create user_roles table following security best practices
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'funcionario',
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents recursive RLS issues)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if current user has a specific role
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), _role)
$$;

-- Function to get current user's highest role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.user_roles 
  WHERE user_id = auth.uid() 
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'gerente' THEN 2 
      WHEN 'recepcionista' THEN 3 
      WHEN 'funcionario' THEN 4 
    END 
  LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to handle new user registration (creates funcionario + role)
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

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();