-- Create the calculate_commission function with proper search_path
CREATE OR REPLACE FUNCTION public.calculate_commission()
RETURNS TRIGGER AS $$
DECLARE
  servico_preco NUMERIC;
  funcionario_tipo_comissao TEXT;
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for commission calculation
DROP TRIGGER IF EXISTS calculate_agendamento_commission ON public.agendamentos;
CREATE TRIGGER calculate_agendamento_commission
  BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_commission();

-- Add updated_at triggers for new tables
DROP TRIGGER IF EXISTS update_funcionarios_updated_at ON public.funcionarios;
CREATE TRIGGER update_funcionarios_updated_at
  BEFORE UPDATE ON public.funcionarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_configuracoes_updated_at ON public.configuracoes;
CREATE TRIGGER update_configuracoes_updated_at
  BEFORE UPDATE ON public.configuracoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();