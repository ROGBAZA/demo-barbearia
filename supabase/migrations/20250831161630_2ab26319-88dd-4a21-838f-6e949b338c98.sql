-- Create funcionarios table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT UNIQUE NOT NULL,
  cargo TEXT NOT NULL,
  nivel_acesso TEXT NOT NULL DEFAULT 'funcionario',
  tipo_comissao TEXT NOT NULL DEFAULT 'percentual',
  valor_comissao NUMERIC NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create configuracoes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_barbearia TEXT NOT NULL DEFAULT 'Barbearia Route 66',
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  horario_abertura TIME NOT NULL DEFAULT '08:00',
  horario_fechamento TIME NOT NULL DEFAULT '18:00',
  dias_funcionamento INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default configuration if table is empty
INSERT INTO public.configuracoes (nome_barbearia, horario_abertura, horario_fechamento) 
SELECT 'Barbearia Route 66', '08:00', '18:00'
WHERE NOT EXISTS (SELECT 1 FROM public.configuracoes);

-- Add new columns to agendamentos if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'funcionario_id') THEN
    ALTER TABLE public.agendamentos ADD COLUMN funcionario_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'comissao_funcionario') THEN
    ALTER TABLE public.agendamentos ADD COLUMN comissao_funcionario NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agendamentos' AND column_name = 'valor_liquido') THEN
    ALTER TABLE public.agendamentos ADD COLUMN valor_liquido NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Create helper functions
CREATE OR REPLACE FUNCTION public.get_current_user_access_level()
RETURNS TEXT AS $$
  SELECT nivel_acesso FROM public.funcionarios WHERE user_id = auth.uid() AND ativo = true;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

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
DROP POLICY IF EXISTS "Admins can manage all funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "Funcionarios can view their own data" ON public.funcionarios;

CREATE POLICY "Admins can manage all funcionarios" 
ON public.funcionarios 
FOR ALL 
USING (public.is_current_user_admin());

CREATE POLICY "Funcionarios can view their own data" 
ON public.funcionarios 
FOR SELECT 
USING (user_id = auth.uid());

-- RLS Policies for configuracoes
DROP POLICY IF EXISTS "Everyone can read configuracoes" ON public.configuracoes;
DROP POLICY IF EXISTS "Only admins can modify configuracoes" ON public.configuracoes;

CREATE POLICY "Everyone can read configuracoes" 
ON public.configuracoes 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can modify configuracoes" 
ON public.configuracoes 
FOR ALL 
USING (public.is_current_user_admin());