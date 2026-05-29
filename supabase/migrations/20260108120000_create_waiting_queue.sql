-- Tabela para fila de espera de clientes sem agendamento
CREATE TYPE public.fila_espera_status AS ENUM (
  'aguardando',
  'em_atendimento',
  'atendido',
  'cancelado'
);

CREATE TABLE public.fila_espera (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  cpf TEXT,
  barbeiro_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  servico_descricao TEXT,
  observacoes TEXT,
  status public.fila_espera_status NOT NULL DEFAULT 'aguardando',
  chegada_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fila_espera ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fila de espera: acesso completo" ON public.fila_espera
FOR ALL USING (true);

-- Trigger para manter updated_at sincronizado
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fila_espera_updated_at
  BEFORE UPDATE ON public.fila_espera
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
