-- Create fila_espera table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.fila_espera (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  cpf TEXT,
  barbeiro_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  servico_descricao TEXT,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'em_atendimento', 'atendido', 'cancelado')),
  chegada_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fila_espera ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Fila de espera: leitura restrita a equipe" ON public.fila_espera;
DROP POLICY IF EXISTS "Fila de espera: atualização restrita a equipe" ON public.fila_espera;
DROP POLICY IF EXISTS "Fila de espera: exclusão restrita a equipe" ON public.fila_espera;
DROP POLICY IF EXISTS "Fila de espera: qualquer um pode entrar" ON public.fila_espera;
DROP POLICY IF EXISTS "Fila de espera: acesso completo" ON public.fila_espera;

-- Create new policies
CREATE POLICY "Fila de espera: leitura restrita a equipe" ON public.fila_espera
FOR SELECT
USING (
  current_user_has_role('recepcionista') OR
  current_user_has_role('gerente') OR
  current_user_has_role('admin')
);

CREATE POLICY "Fila de espera: atualização restrita a equipe" ON public.fila_espera
FOR UPDATE
USING (
  current_user_has_role('recepcionista') OR
  current_user_has_role('gerente') OR
  current_user_has_role('admin')
)
WITH CHECK (
  current_user_has_role('recepcionista') OR
  current_user_has_role('gerente') OR
  current_user_has_role('admin')
);

CREATE POLICY "Fila de espera: exclusão restrita a equipe" ON public.fila_espera
FOR DELETE
USING (
  current_user_has_role('recepcionista') OR
  current_user_has_role('gerente') OR
  current_user_has_role('admin')
);

CREATE POLICY "Fila de espera: qualquer um pode entrar" ON public.fila_espera
FOR INSERT
WITH CHECK (
  true
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_fila_espera_updated_at ON public.fila_espera;
CREATE TRIGGER update_fila_espera_updated_at
  BEFORE UPDATE ON public.fila_espera
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();