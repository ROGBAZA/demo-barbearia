-- Fix security issues by setting proper search_path for functions
CREATE OR REPLACE FUNCTION public.get_current_user_access_level()
RETURNS TEXT AS $$
  SELECT nivel_acesso FROM public.funcionarios WHERE user_id = auth.uid() AND ativo = true;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.funcionarios 
    WHERE user_id = auth.uid() 
    AND nivel_acesso = 'administrador' 
    AND ativo = true
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;