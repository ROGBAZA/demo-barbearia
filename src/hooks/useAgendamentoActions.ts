import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Hook para concluir/cancelar agendamento (barbeiros podem concluir, gerentes/recepção podem concluir e cancelar)
export function useConcluirAgendamento(userRole?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'concluido' | 'cancelado' }) => {
      // Barbeiros, gerentes, recepção e admins podem marcar como concluído
      // Apenas gerentes, recepção e admins podem cancelar
      const canCancel = userRole === 'gerente' || userRole === 'recepcionista' || userRole === 'admin' || userRole === 'super_admin';
      const canConcluir = userRole === 'funcionario' || userRole === 'gerente' || userRole === 'recepcionista' || userRole === 'admin' || userRole === 'super_admin';

      if (status === 'cancelado' && !canCancel) {
        throw new Error('Você não tem permissão para cancelar agendamentos');
      }
      if (status === 'concluido' && !canConcluir) {
        throw new Error('Você não tem permissão para concluir agendamentos');
      }

      const { data, error } = await supabase
        .from('agendamentos')
        .update({ status })
        .eq('id', id)
        .select(`
          *,
          servicos(preco),
          funcionarios!agendamentos_funcionario_id_fkey(tipo_comissao, valor_comissao)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['relatorios'] });
      toast({
        title: "Status atualizado com sucesso!",
        description: "O agendamento foi marcado como concluído."
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive"
      });
    },
  });
}

// Hook para excluir agendamento (apenas gerente e recepção)
export function useDeleteAgendamentoComPermissao(userRole?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Verifica se o usuário tem permissão (Gerente, Recepção, Admin ou SuperAdmin)
      const canDelete = userRole === 'gerente' || userRole === 'recepcionista' || userRole === 'admin' || userRole === 'super_admin';

      if (!canDelete) {
        throw new Error('Você não tem permissão para excluir agendamentos');
      }

      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['relatorios'] });
      toast({ title: "Agendamento excluído com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir agendamento",
        description: error.message,
        variant: "destructive"
      });
    },
  });
}
