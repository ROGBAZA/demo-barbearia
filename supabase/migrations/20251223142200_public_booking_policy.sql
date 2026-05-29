-- Permitir inserções públicas na tabela agendamentos
-- Para o formulário de agendamento público funcionar

-- Política para permitir inserções na tabela agendamentos
CREATE POLICY "Permitir inserções públicas de agendamentos" ON agendamentos
FOR INSERT WITH CHECK (true);

-- Política para permitir inserções na tabela clientes
CREATE POLICY "Permitir inserções públicas de clientes" ON clientes
FOR INSERT WITH CHECK (true);

-- Política para permitir leitura de clientes por telefone
CREATE POLICY "Permitir busca pública de clientes por telefone" ON clientes
FOR SELECT USING (true);

-- Política para permitir leitura de clientes por email
CREATE POLICY "Permitir busca pública de clientes por email" ON clientes
FOR SELECT USING (true);
