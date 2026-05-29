-- Migration para segurança administrativa e auditoria

-- Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar índices para performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Tabela de papéis de usuário (se não existir)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'gerente', 'recepcionista', 'funcionario', 'cliente')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Adicionar índice
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- Trigger para criar log de auditoria automaticamente
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (action, details)
    VALUES ('INSERT_' || TG_TABLE_NAME, row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (action, details)
    VALUES ('UPDATE_' || TG_TABLE_NAME, json_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (action, details)
    VALUES ('DELETE_' || TG_TABLE_NAME, row_to_json(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Adicionar trigger de auditoria na tabela funcionarios
DROP TRIGGER IF EXISTS funcionarios_audit_trigger ON funcionarios;
CREATE TRIGGER funcionarios_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON funcionarios
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Política de segurança para audit_logs (apenas admin pode ver)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver todos os logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins podem inserir logs" ON audit_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- Política para user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Usuarios podem ver seu proprio role" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário é gerente ou admin
CREATE OR REPLACE FUNCTION is_gerente_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'gerente')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar trigger de criação de usuário para definir role padrão
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir na tabela apropriada baseada no metadata
  IF NEW.raw_user_meta_data->>'cargo' = 'cliente' THEN
    INSERT INTO clientes (nome, email, user_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'nome', 'Cliente'),
      NEW.email,
      NEW.id
    );
    
    -- Definir role como cliente
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, 'cliente');
    
  ELSE
    -- Para funcionários, verificar se é criação autorizada
    -- Apenas admins podem criar funcionários através do admin panel
    -- Se vier do registro público, força para cliente
    INSERT INTO clientes (nome, email, user_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'nome', 'Cliente'),
      NEW.email,
      NEW.id
    );
    
    -- Sempre definir como cliente para registros públicos
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, 'cliente');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que o trigger exista
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Criar função para admin criar funcionários
CREATE OR REPLACE FUNCTION admin_create_funcionario(
  p_email TEXT,
  p_password TEXT,
  p_nome TEXT,
  p_cargo TEXT,
  p_nivel_acesso TEXT DEFAULT 'funcionario',
  p_tipo_comissao TEXT DEFAULT 'percentual',
  p_valor_comissao NUMERIC DEFAULT 10
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Verificar se usuário atual é admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem criar funcionários';
  END IF;
  
  -- Criar usuário no auth
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data
  ) VALUES (
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    json_build_object('nome', p_nome, 'cargo', p_cargo)
  ) RETURNING id INTO new_user_id;
  
  -- Inserir na tabela funcionarios
  INSERT INTO funcionarios (
    nome,
    email,
    cargo,
    nivel_acesso,
    tipo_comissao,
    valor_comissao,
    ativo,
    user_id
  ) VALUES (
    p_nome,
    p_email,
    p_cargo,
    p_nivel_acesso,
    p_tipo_comissao,
    p_valor_comissao,
    true,
    new_user_id
  );
  
  -- Definir role apropriado
  INSERT INTO user_roles (user_id, role)
  VALUES (new_user_id, p_nivel_acesso);
  
  -- Log de auditoria
  INSERT INTO audit_logs (
    user_id,
    target_user_id,
    action,
    details
  ) VALUES (
    auth.uid(),
    new_user_id,
    'CREATE_FUNCIONARIO',
    json_build_object(
      'nome', p_nome,
      'email', p_email,
      'cargo', p_cargo,
      'nivel_acesso', p_nivel_acesso
    )
  );
  
  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que o usuário admin exista
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'rogendor15.com'
ON CONFLICT (user_id) DO NOTHING;

-- Atualizar funcionários existentes para ter role apropriado
UPDATE user_roles
SET role = f.nivel_acesso
FROM funcionarios f
WHERE user_roles.user_id = f.user_id
AND f.nivel_acesso IN ('administrador', 'gerente', 'recepcionista', 'funcionario');
