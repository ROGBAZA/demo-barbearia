-- =====================================================
-- SISTEMA DE NOTIFICAÇÕES
-- =====================================================
-- Tabela para armazenar notificações do sistema
-- Data: 10/02/2026

-- 1. Criar tabela de notificações
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('novo_agendamento', 'cancelamento', 'lembrete', 'fila_proximo', 'sistema')),
  titulo text NOT NULL,
  mensagem text NOT NULL,
  lida boolean DEFAULT false,
  data jsonb, -- Dados extras (id do agendamento, cliente, etc.)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_notificacoes_tenant ON public.notificacoes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_user ON public.notificacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON public.notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_created ON public.notificacoes(created_at DESC);

-- 3. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_notificacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notificacoes_updated_at
  BEFORE UPDATE ON public.notificacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_notificacoes_updated_at();

-- 4. Habilitar RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS

-- SELECT: Usuário vê apenas suas próprias notificações do seu tenant
CREATE POLICY "Usuários veem apenas suas notificações"
  ON public.notificacoes
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    AND tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid
  );

-- INSERT: Sistema pode criar notificações (via service role ou funções)
CREATE POLICY "Sistema pode criar notificações"
  ON public.notificacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid
  );

-- UPDATE: Usuário pode atualizar apenas suas próprias notificações (marcar como lida)
CREATE POLICY "Usuários podem atualizar suas notificações"
  ON public.notificacoes
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() 
    AND tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    user_id = auth.uid() 
    AND tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid
  );

-- DELETE: Usuário pode deletar apenas suas próprias notificações
CREATE POLICY "Usuários podem deletar suas notificações"
  ON public.notificacoes
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() 
    AND tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid
  );

-- 6. Função para criar notificação automática em novos agendamentos
CREATE OR REPLACE FUNCTION criar_notificacao_novo_agendamento()
RETURNS TRIGGER AS $$
DECLARE
  v_cliente_nome text;
  v_servico_nome text;
  v_funcionario_user_id uuid;
BEGIN
  -- Buscar informações para a notificação
  SELECT c.nome INTO v_cliente_nome 
  FROM public.clientes c 
  WHERE c.id = NEW.cliente_id;
  
  SELECT s.nome INTO v_servico_nome 
  FROM public.servicos s 
  WHERE s.id = NEW.servico_id;
  
  -- Buscar user_id do funcionário para enviar notificação
  SELECT f.user_id INTO v_funcionario_user_id 
  FROM public.funcionarios f 
  WHERE f.id = NEW.funcionario_id;
  
  -- Criar notificação para o funcionário
  IF v_funcionario_user_id IS NOT NULL THEN
    INSERT INTO public.notificacoes (
      tenant_id,
      user_id,
      tipo,
      titulo,
      mensagem,
      data
    ) VALUES (
      NEW.tenant_id,
      v_funcionario_user_id,
      'novo_agendamento',
      '🆕 Novo Agendamento!',
      format('Cliente %s agendou %s para %s', 
        COALESCE(v_cliente_nome, 'Desconhecido'),
        COALESCE(v_servico_nome, 'serviço'),
        to_char(NEW.data_hora, 'DD/MM/YYYY às HH24:MI')
      ),
      jsonb_build_object(
        'agendamento_id', NEW.id,
        'cliente_nome', v_cliente_nome,
        'servico_nome', v_servico_nome,
        'data_hora', NEW.data_hora
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger para notificar novo agendamento
DROP TRIGGER IF EXISTS trigger_notificacao_novo_agendamento ON public.agendamentos;
CREATE TRIGGER trigger_notificacao_novo_agendamento
  AFTER INSERT ON public.agendamentos
  FOR EACH ROW
  WHEN (NEW.status = 'agendado')
  EXECUTE FUNCTION criar_notificacao_novo_agendamento();

-- 8. Função para marcar todas como lidas
CREATE OR REPLACE FUNCTION marcar_todas_notificacoes_lidas(user_uuid uuid)
RETURNS integer AS $$
DECLARE
  v_tenant_id uuid;
  v_count integer;
BEGIN
  -- Pegar tenant do usuário
  v_tenant_id := (
    SELECT (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid
  );
  
  -- Atualizar notificações
  UPDATE public.notificacoes
  SET lida = true, updated_at = now()
  WHERE user_id = user_uuid
    AND tenant_id = v_tenant_id
    AND lida = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.notificacoes IS 'Notificações do sistema por usuário e tenant';
COMMENT ON FUNCTION criar_notificacao_novo_agendamento() IS 'Cria notificação automática quando há novo agendamento';
COMMENT ON FUNCTION marcar_todas_notificacoes_lidas(uuid) IS 'Marca todas as notificações de um usuário como lidas';
