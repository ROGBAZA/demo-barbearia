-- Políticas RLS específicas para proteger a fila de espera
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
