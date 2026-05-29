-- Create enum for employee positions
CREATE TYPE public.cargo_funcionario AS ENUM ('barbeiro', 'recepcao', 'auxiliar');

-- Create enum for access levels
CREATE TYPE public.nivel_acesso AS ENUM ('funcionario', 'administrador');

-- Create enum for commission types
CREATE TYPE public.tipo_comissao AS ENUM ('percentual', 'valor_fixo');

-- Create funcionarios table
CREATE TABLE public.funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT UNIQUE NOT NULL,
  cargo cargo_funcionario NOT NULL,
  nivel_acesso nivel_acesso NOT NULL DEFAULT 'funcionario',
  tipo_comissao tipo_comissao NOT NULL DEFAULT 'percentual',
  valor_comissao NUMERIC NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create configuracoes table
CREATE TABLE public.configuracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_barbearia TEXT NOT NULL DEFAULT 'Barbearia Route 66',
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  horario_abertura TIME NOT NULL DEFAULT '08:00',
  horario_fechamento TIME NOT NULL DEFAULT '18:00',
  dias_funcionamento INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6}', -- 0=domingo, 1=segunda, etc
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default configuration
INSERT INTO public.configuracoes (nome_barbearia, horario_abertura, horario_fechamento) VALUES 
('Barbearia Route 66', '08:00', '18:00');

-- Add funcionario_id to agendamentos table
ALTER TABLE public.agendamentos ADD COLUMN funcionario_id UUID REFERENCES public.funcionarios(id);

-- Add comissao_funcionario and valor_liquido columns
ALTER TABLE public.agendamentos ADD COLUMN comissao_funcionario NUMERIC DEFAULT 0;
ALTER TABLE public.agendamentos ADD COLUMN valor_liquido NUMERIC DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Create function to get current user access level
CREATE OR REPLACE FUNCTION public.get_current_user_access_level()
RETURNS TEXT AS $$
  SELECT nivel_acesso::text FROM public.funcionarios WHERE user_id = auth.uid() AND ativo = true;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.funcionarios 
    WHERE user_id = auth.uid() 
    AND nivel_acesso = 'administrador' 
    AND ativo = true
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for funcionarios
CREATE POLICY "Admins can manage all funcionarios" 
ON public.funcionarios 
FOR ALL 
USING (public.is_current_user_admin());

CREATE POLICY "Funcionarios can view their own data" 
ON public.funcionarios 
FOR SELECT 
USING (user_id = auth.uid());

-- RLS Policies for configuracoes
CREATE POLICY "Everyone can read configuracoes" 
ON public.configuracoes 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can modify configuracoes" 
ON public.configuracoes 
FOR ALL 
USING (public.is_current_user_admin());

-- Update agendamentos policies to include funcionario access
DROP POLICY IF EXISTS "Permitir acesso completo aos agendamentos" ON public.agendamentos;

CREATE POLICY "Admins can manage all agendamentos" 
ON public.agendamentos 
FOR ALL 
USING (public.is_current_user_admin());

CREATE POLICY "Funcionarios can view all agendamentos" 
ON public.agendamentos 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Funcionarios can create agendamentos" 
ON public.agendamentos 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Funcionarios can update agendamentos" 
ON public.agendamentos 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Function to calculate commission when agendamento is completed
CREATE OR REPLACE FUNCTION public.calculate_commission()
RETURNS TRIGGER AS $$
DECLARE
  servico_preco NUMERIC;
  funcionario_tipo_comissao tipo_comissao;
  funcionario_valor_comissao NUMERIC;
  comissao_calculada NUMERIC;
BEGIN
  -- Only calculate if status changed to 'concluido'
  IF NEW.status = 'concluido' AND (OLD.status IS NULL OR OLD.status != 'concluido') THEN
    -- Get service price
    SELECT preco INTO servico_preco FROM public.servicos WHERE id = NEW.servico_id;
    
    -- Get funcionario commission info
    SELECT tipo_comissao, valor_comissao 
    INTO funcionario_tipo_comissao, funcionario_valor_comissao
    FROM public.funcionarios 
    WHERE id = NEW.funcionario_id;
    
    -- Calculate commission
    IF funcionario_tipo_comissao = 'percentual' THEN
      comissao_calculada := servico_preco * (funcionario_valor_comissao / 100);
    ELSE
      comissao_calculada := funcionario_valor_comissao;
    END IF;
    
    -- Update agendamento with commission values
    NEW.comissao_funcionario := comissao_calculada;
    NEW.valor_liquido := servico_preco - comissao_calculada;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for commission calculation
CREATE TRIGGER calculate_agendamento_commission
  BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_commission();

-- Add updated_at triggers for new tables
CREATE TRIGGER update_funcionarios_updated_at
  BEFORE UPDATE ON public.funcionarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_configuracoes_updated_at
  BEFORE UPDATE ON public.configuracoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();