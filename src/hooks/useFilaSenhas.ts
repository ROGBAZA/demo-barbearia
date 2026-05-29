import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

// Hook para criar entrada na fila COM número de senha automático
export function useCreateFilaPublicaComSenha() {
    const { tenant } = useTenant();

    return useMutation({
        mutationFn: async (data: {
            nome: string;
            telefone: string;
            servico_descricao?: string;
            observacoes?: string;
            cliente_id?: string
        }) => {
            if (!tenant?.id) throw new Error("Tenant não identificado.");

            const { data: result, error } = await (supabase as any).rpc('create_fila_espera_public', {
                p_tenant_id: tenant.id,
                p_nome: data.nome,
                p_telefone: data.telefone,
                p_servico_descricao: data.servico_descricao || null,
                p_observacoes: data.observacoes || null,
                p_cliente_id: data.cliente_id || null
            });

            if (error) throw error;

            // Retorna { fila_id, senha_numero }
            return result[0] as { fila_id: string; senha_numero: number };
        }
    });
}
