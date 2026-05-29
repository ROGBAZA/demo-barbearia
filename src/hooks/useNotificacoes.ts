import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export interface Notificacao {
    id: string;
    tenant_id: string;
    user_id: string;
    tipo: 'novo_agendamento' | 'cancelamento' | 'lembrete' | 'fila_proximo' | 'sistema';
    titulo: string;
    mensagem: string;
    lida: boolean;
    data?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

// Hook para buscar notificações do usuário
export function useNotificacoes() {
    const { tenant } = useTenant();
    const { user } = useAuth();

    return useQuery({
        queryKey: ['notificacoes', tenant?.id, user?.id],
        queryFn: async () => {
            if (!tenant?.id || !user?.id) return [];

            const { data, error } = await supabase
                .from('notificacoes')
                .select('*')
                .eq('tenant_id', tenant.id)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data as Notificacao[];
        },
        enabled: !!tenant?.id && !!user?.id,
        staleTime: 10 * 1000, // 10 segundos
        gcTime: 60 * 1000, // 1 minuto
    });
}

// Hook para buscar apenas não lidas
export function useNotificacoesNaoLidas() {
    const { tenant } = useTenant();
    const { user } = useAuth();

    return useQuery({
        queryKey: ['notificacoes-nao-lidas', tenant?.id, user?.id],
        queryFn: async () => {
            if (!tenant?.id || !user?.id) return [];

            const { data, error } = await supabase
                .from('notificacoes')
                .select('*')
                .eq('tenant_id', tenant.id)
                .eq('user_id', user.id)
                .eq('lida', false)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Notificacao[];
        },
        enabled: !!tenant?.id && !!user?.id,
        staleTime: 5 * 1000, // 5 segundos
        refetchInterval: 10 * 1000, // Refetch a cada 10 segundos
    });
}

// Hook para marcar como lida
export function useMarcarNotificacaoLida() {
    const queryClient = useQueryClient();
    const { tenant } = useTenant();

    return useMutation({
        mutationFn: async (notificacaoId: string) => {
            if (!tenant?.id) throw new Error('Tenant não identificado');

            const { data, error } = await supabase
                .from('notificacoes')
                .update({ lida: true })
                .eq('id', notificacaoId)
                .eq('tenant_id', tenant.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
            queryClient.invalidateQueries({ queryKey: ['notificacoes-nao-lidas'] });
        },
        onError: (error: any) => {
            console.error('Erro ao marcar notificação como lida:', error);
        },
    });
}

// Hook para marcar TODAS como lidas
export function useMarcarTodasLidas() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async () => {
            if (!user?.id) throw new Error('Usuário não identificado');

            const { data, error } = await supabase.rpc('marcar_todas_notificacoes_lidas', {
                user_uuid: user.id,
            });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
            queryClient.invalidateQueries({ queryKey: ['notificacoes-nao-lidas'] });
            toast({
                title: '✅ Todas as notificações marcadas como lidas',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Erro ao marcar notificações',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// Hook para deletar notificação
export function useDeletarNotificacao() {
    const queryClient = useQueryClient();
    const { tenant } = useTenant();

    return useMutation({
        mutationFn: async (notificacaoId: string) => {
            if (!tenant?.id) throw new Error('Tenant não identificado');

            const { error } = await supabase
                .from('notificacoes')
                .delete()
                .eq('id', notificacaoId)
                .eq('tenant_id', tenant.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
            queryClient.invalidateQueries({ queryKey: ['notificacoes-nao-lidas'] });
            toast({
                title: 'Notificação removida',
            });
        },
        onError: (error: any) => {
            toast({
                title: 'Erro ao remover notificação',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

// Hook para escutar notificações em tempo real via Supabase Realtime
export function useRealtimeNotificacoes() {
    const queryClient = useQueryClient();
    const { tenant } = useTenant();
    const { user } = useAuth();

    useEffect(() => {
        if (!tenant?.id || !user?.id) return;

        const channel = supabase
            .channel('notificacoes-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notificacoes',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('📢 Nova notificação recebida:', payload);

                    // Invalidar queries para atualizar lista
                    queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
                    queryClient.invalidateQueries({ queryKey: ['notificacoes-nao-lidas'] });

                    // Mostrar toast da notificação
                    const notif = payload.new as Notificacao;
                    toast({
                        title: notif.titulo,
                        description: notif.mensagem,
                        duration: 5000,
                    });

                    // Tocar som (opcional)
                    try {
                        const audio = new Audio('/notification-sound.mp3');
                        audio.play().catch(e => console.log('Audio blocked:', e));
                    } catch (e) {
                        console.log('Audio not supported');
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tenant?.id, user?.id, queryClient]);
}
