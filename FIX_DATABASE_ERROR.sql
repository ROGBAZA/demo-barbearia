-- COPIE E EXECUTE ESTE SCRIPT NO SQL EDITOR DO SUPABASE (https://supabase.com/dashboard/project/_/sql)
-- Isso resolverá o erro de "Database error" ao criar novos usuários ou clientes com e-mails já existentes.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Verifica se é um cadastro de cliente (padrão da tela de login)
  IF NEW.raw_user_meta_data->>'cargo' = 'cliente' OR NEW.raw_user_meta_data->>'cargo' IS NULL THEN
    
    -- Tenta inserir o cliente. Se o e-mail já existir, ele APENAS VINCULA o user_id (se estiver vazio).
    -- Isso permite que um cliente que já foi na barbearia (cadastro manual) crie sua conta de acesso agora.
    INSERT INTO public.clientes (nome, email, user_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'nome', 'Cliente'),
      NEW.email,
      NEW.id
    )
    ON CONFLICT (email) DO UPDATE 
    SET user_id = EXCLUDED.user_id
    WHERE public.clientes.user_id IS NULL;
    
    -- Garante que o usuário tenha o papel de 'cliente' na tabela de permissões
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'cliente')
    ON CONFLICT (user_id) DO NOTHING;

  ELSE
    -- Caso seja um funcionário criado pelo admin (metadados diferentes)
    -- O papel será definido pelo admin panel, mas garantimos o role básico aqui se necessário
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'cargo', 'cliente'))
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-aplicar o trigger para garantir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
