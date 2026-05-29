import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Types
export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  data_cadastro: string;
  ultima_visita?: string;
}

export interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
  foto_url?: string;
  tenant_id?: string;
}

export interface Agendamento {
  id: string;
  cliente_id: string;
  servico_id: string;
  funcionario_id?: string;
  funcionario: string;
  data_hora: string;
  status: 'agendado' | 'concluido' | 'cancelado' | 'chamado';
  observacoes?: string;
  comissao_funcionario?: number;
  valor_liquido?: number;
  created_at: string;
  updated_at: string;
  cliente?: {
    id: string;
    nome: string;
    telefone?: string;
    email?: string;
  };
  servico?: { nome: string; preco: number };
  funcionarios?: { nome: string };
}

export interface Funcionario {
  id: string;
  nome: string;
  telefone?: string;
  email: string;
  cargo: 'barbeiro' | 'recepcao' | 'auxiliar' | 'gerente';
  nivel_acesso: 'funcionario' | 'administrador' | 'recepcionista';
  tipo_comissao: 'percentual' | 'valor_fixo';
  valor_comissao: number;
  foto_url?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Configuracao {
  id: string;
  nome_barbearia: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  horario_abertura: string;
  horario_fechamento: string;
  dias_funcionamento: number[];
  logo_url?: string;
  banner_url?: string;
  updated_at: string;
}

export interface FilaEsperaEntry {
  id: string;
  cliente_id?: string | null;
  nome: string;
  telefone?: string | null;
  servico_descricao?: string | null;
  observacoes?: string | null;
  status: 'aguardando' | 'em_atendimento' | 'atendido' | 'cancelado' | 'chamado';
  chegada_em: string;
  created_at: string;
  updated_at: string;
}

export interface Plano {
  id: string;
  nome: string;
  preco: number;
  limite_cortes: number;
  limite_barbas: number;
  duracao_meses: number;
  descricao: string | null;
  created_at?: string;
}

export interface AssinaturaCliente {
  id: string;
  cliente_id: string;
  plano_id: string;
  status: 'ativo' | 'cancelado' | 'expirado';
  cortes_restantes: number;
  barbas_restantes: number;
  data_inicio: string;
  proxima_renovacao: string;
  created_at?: string;
  plano?: Plano;
  cliente?: Cliente;
}

import { useTenant, Tenant } from "@/contexts/TenantContext";

// Clientes hooks
export function useClientes() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ['clientes', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('nome');

      if (error) throw error;
      return data as Cliente[];
    },
    enabled: !!tenant?.id,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useCreateCliente() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (cliente: Omit<Cliente, 'id' | 'data_cadastro'>) => {
      if (!tenant?.id) throw new Error("Tenant não identificado.");

      const trimmedEmail = cliente.email?.toLowerCase().trim();
      const trimmedPhone = cliente.telefone?.replace(/\D/g, '').trim();
      const trimmedNome = cliente.nome.trim();

      // 1. Tenta encontrar cliente existente por Email ou Telefone NO MESMO TENANT
      const orConditions = [];
      if (trimmedEmail) orConditions.push(`email.ilike.${trimmedEmail}`);
      if (trimmedPhone) orConditions.push(`telefone.eq.${trimmedPhone}`);

      if (orConditions.length > 0) {
        const { data: existingCliente } = await supabase
          .from('clientes')
          .select('*')
          .eq('tenant_id', tenant.id)
          .or(orConditions.join(','))
          .maybeSingle();

        if (existingCliente) {
          console.log('✅ Cliente existente encontrado no useCreateCliente:', existingCliente.nome);
          return existingCliente;
        }
      }

      // 2. Tenta encontrar por Nome Exato se não achou acima NO MESMO TENANT
      const { data: nameMatch } = await supabase
        .from('clientes')
        .select('*')
        .eq('tenant_id', tenant.id)
        .ilike('nome', trimmedNome)
        .maybeSingle();

      if (nameMatch) {
        console.log('✅ Cliente encontrado por nome no useCreateCliente:', nameMatch.nome);
        return nameMatch;
      }

      // 3. Se realmente não existe, cria novo
      const clienteData = {
        ...cliente,
        nome: trimmedNome,
        email: trimmedEmail || null,
        telefone: trimmedPhone || null,
        tenant_id: tenant.id // Garante que cria no tenant correto
      };

      const { data, error } = await supabase
        .from('clientes')
        .insert(clienteData)
        .select()
        .single();

      if (error) {
        // Fallback final se o insert falhar (conflito de última hora)
        if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
          const { data: fallback } = await supabase
            .from('clientes')
            .select('*')
            .eq('tenant_id', tenant.id)
            .or(`email.ilike.${trimmedEmail},telefone.eq.${trimmedPhone},nome.ilike.${trimmedNome}`)
            .maybeSingle();
          if (fallback) return fallback;
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({ title: "Cliente criado com sucesso!" });
    },
    onError: (error) => {
      let errorMessage = "Erro ao criar cliente";

      if (error.message.includes('duplicate key') || error.message.includes('clientes_email_idx')) {
        errorMessage = "Já existe um cliente cadastrado com este email.";
      } else if (error.message.includes('Já existe um cliente cadastrado com este email')) {
        errorMessage = error.message;
      } else {
        errorMessage = error.message;
      }

      toast({
        title: errorMessage,
        variant: "destructive"
      });
    },
  });
}

export function useServicos() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ['servicos', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('nome');

      if (error) throw error;
      return data as Servico[];
    },
    enabled: !!tenant?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useFilaEspera() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ['fila-espera', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('fila_espera')
        .select('*')
        .eq('tenant_id', tenant.id)
        .gte('created_at', today.toISOString())
        .order('chegada_em', { ascending: true });

      if (error) throw error;
      return data as FilaEsperaEntry[];
    },
    enabled: !!tenant?.id,
    staleTime: 10 * 1000,
    gcTime: 60 * 1000,
  });
}

export function useFilaPublica() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ['fila-publica', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await (supabase as any).rpc('get_fila_publica_v2', { p_tenant_id: tenant.id });
      if (error) throw error;
      return (data as unknown) as FilaEsperaEntry[];
    },
    enabled: !!tenant?.id,
    staleTime: 5 * 1000,
    gcTime: 60 * 1000,
  });
}

export function useCreateFilaPublica() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (entry: {
      nome: string;
      telefone: string;
      servico_descricao?: string;
      email?: string;
      observacoes?: string;
      barbeiro_id?: string;
      cpf?: string;
    }) => {
      if (!tenant?.id) throw new Error("Barbearia não identificada.");

      const { data, error } = await (supabase as any).rpc('join_queue_public', {
        p_tenant_id: tenant.id,
        p_nome: entry.nome,
        p_telefone: entry.telefone,
        p_email: entry.email || null,
        p_servico: entry.servico_descricao || null,
        p_observacoes: entry.observacoes || null,
        p_barbeiro_id: entry.barbeiro_id === 'any' ? null : (entry.barbeiro_id || null),
        p_cpf: entry.cpf || null
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fila-publica'] });
      queryClient.invalidateQueries({ queryKey: ['fila-espera'] });
    }
  });
}

export function useAgendamentosHoje(funcionarioId?: string) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ['agendamentos-hoje', tenant?.id, funcionarioId],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      let query = supabase
        .from('agendamentos')
        .select(`
          *,
          cliente:clientes(id, nome, telefone),
          servico:servicos(id, nome, preco)
        `)
        .eq('tenant_id', tenant.id)
        .gte('data_hora', startOfDay.toISOString())
        .lte('data_hora', endOfDay.toISOString())
        .order('data_hora', { ascending: true });

      if (funcionarioId) {
        query = query.eq('funcionario_id', funcionarioId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id,
    staleTime: 10 * 1000,
  });
}

export function useCreateFilaEspera() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (entry: Omit<FilaEsperaEntry, 'id' | 'created_at' | 'updated_at'>) => {
      if (!tenant?.id) throw new Error("Tenant não identificado.");

      const entryWithTenant = { ...entry, tenant_id: tenant.id };
      console.log('useCreateFilaEspera: Enviando para Supabase:', entryWithTenant);
      const { data, error } = await supabase
        .from('fila_espera')
        .insert(entryWithTenant)
        .select()
        .single();

      if (error) {
        console.error('useCreateFilaEspera: Erro do Supabase:', error);
        throw error;
      }

      console.log('useCreateFilaEspera: Resposta do Supabase:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fila-espera'] });
      toast({ title: "Fila atualizada", description: "Cliente entrou na fila de espera." });
    },
    onError: (error) => {
      console.error('useCreateFilaEspera: Erro no mutation:', error);
      toast({ title: "Erro na fila de espera", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateFilaEspera() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant(); // Add tenant context

  return useMutation({
    mutationFn: async ({ id, ...entry }: Partial<FilaEsperaEntry> & { id: string }) => {
      if (!tenant?.id) throw new Error("Tenant ID missing"); // Validate tenant

      const { data, error } = await supabase
        .from('fila_espera')
        .update(entry)
        .eq('id', id)
        .eq('tenant_id', tenant.id) // Scope to tenant
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fila-espera'] });
      toast({ title: "Fila atualizada", description: "Status do cliente atualizado." });
    },
    onError: (error) => {
      toast({ title: "Erro na fila de espera", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateCliente() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async ({ id, ...cliente }: Partial<Cliente> & { id: string }) => {
      if (!tenant?.id) throw new Error("Tenant ID missing");

      const { data, error } = await supabase
        .from('clientes')
        .update(cliente)
        .eq('id', id)
        .eq('tenant_id', tenant.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({ title: "Cliente atualizado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar cliente", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteCliente() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenant?.id) throw new Error("Tenant ID missing");

      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({ title: "Cliente removido com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover cliente", description: error.message, variant: "destructive" });
    },
  });
}


export function useCreateServico() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (servico: Omit<Servico, 'id'>) => {
      if (!tenant?.id) throw new Error("Tenant não identificado.");

      const { data, error } = await supabase
        .from('servicos')
        .insert({ ...servico, tenant_id: tenant.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] });
      toast({ title: "Serviço criado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar serviço", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateServico() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async ({ id, ...servico }: Partial<Servico> & { id: string }) => {
      if (!tenant?.id) throw new Error("Tenant ID missing");

      const { data, error } = await supabase
        .from('servicos')
        .update(servico)
        .eq('id', id)
        .eq('tenant_id', tenant.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] });
      toast({ title: "Serviço atualizado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar serviço", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteServico() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenant?.id) throw new Error("Tenant ID missing");

      const { error } = await supabase
        .from('servicos')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] });
      toast({ title: "Serviço removido com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover serviço", description: error.message, variant: "destructive" });
    },
  });
}

// Agendamentos hooks
export function useCreateAgendamentoPublico() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (agendamento: { cliente_id: string; servico_id: string; funcionario_id: string; data_hora: string; observacoes?: string }) => {
      if (!tenant?.id) throw new Error("Tenant não identificado.");
      const { data, error } = await (supabase as any).rpc('create_agendamento_public', {
        p_tenant_id: tenant.id,
        p_cliente_id: agendamento.cliente_id,
        p_servico_id: agendamento.servico_id,
        p_funcionario_id: agendamento.funcionario_id,
        p_data_hora: agendamento.data_hora,
        p_observacoes: agendamento.observacoes
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
    }
  });
}

export function useGetOrCreateClientPublic() {
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (client: { nome: string; telefone: string; email?: string; user_id?: string }) => {
      if (!tenant?.id) throw new Error("Tenant não identificado.");
      const { data, error } = await (supabase as any).rpc('get_or_create_client_public', {
        p_tenant_id: tenant.id,
        p_nome: client.nome,
        p_telefone: client.telefone,
        p_email: client.email || null,
        p_user_id: client.user_id || null
      });
      if (error) throw error;
      return data as string;
    }
  });
}

export function useAgendamentos(filters?: any) {
  const { tenant } = useTenant();
  const { user, userRole } = useAuth();

  return useQuery({
    queryKey: ['agendamentos', tenant?.id, filters],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const userId = user?.id;

      let query = supabase
        .from('agendamentos')
        .select(`
          *,
          cliente:clientes (
            id,
            nome,
            telefone,
            email
          ),
          servico:servicos (
            id,
            nome,
            preco
          ),
          funcionarios!agendamentos_funcionario_id_fkey (
            id,
            nome,
            nivel_acesso,
            tipo_comissao,
            valor_comissao
          )
        `)
        .eq('tenant_id', tenant.id);

      if (userId && userRole === 'funcionario') {
        query = query.eq('funcionario_id', userId);
      }

      query = query.order('data_hora', { ascending: false });

      const { data, error } = await query;

      console.log('DEBUG - Query agendamentos:', { data, error });

      if (error) {
        console.error('Erro na query de agendamentos:', error);
        throw error;
      }

      // Transformar os dados para o formato esperado
      return (data || []).map((agendamento: any) => {
        // Calcula o valor líquido se o agendamento estiver concluído
        let valorLiquido = agendamento.servico?.preco || 0;
        let comissaoFuncionario = 0;

        if (agendamento.status === 'concluido' && agendamento.funcionarios) {
          const precoServico = agendamento.servico?.preco || 0;
          // Se o agendamento já tem comissão gravada, usa ela
          if (agendamento.comissao_funcionario !== null && agendamento.comissao_funcionario !== undefined && Number(agendamento.comissao_funcionario) > 0) {
            comissaoFuncionario = Number(agendamento.comissao_funcionario);
          } else {
            const valorComissaoFunc = agendamento.funcionarios?.valor_comissao;
            const tipoComissaoFunc = agendamento.funcionarios?.tipo_comissao;

            if (valorComissaoFunc !== null && valorComissaoFunc !== undefined && Number(valorComissaoFunc) >= 0) {
              if (tipoComissaoFunc === 'percentual') {
                comissaoFuncionario = (precoServico * Number(valorComissaoFunc)) / 100;
              } else {
                comissaoFuncionario = Number(valorComissaoFunc);
              }
            } else {
              // Padrão: 30% se não houver valor configurado
              comissaoFuncionario = (precoServico * 30) / 100;
            }
          }
          valorLiquido = precoServico - comissaoFuncionario;
        }

        return {
          ...agendamento,
          cliente: agendamento.cliente || null,
          servico: agendamento.servico || null,
          funcionarios: agendamento.funcionarios || null,
          valor_liquido: valorLiquido,
          comissao_funcionario: comissaoFuncionario
        };
      }) as Agendamento[];
    },
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useCreateAgendamento() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (agendamento: Omit<Agendamento, 'id' | 'cliente' | 'servico' | 'funcionarios' | 'created_at' | 'updated_at'>) => {
      if (!tenant?.id) throw new Error("Tenant não identificado.");

      const { data, error } = await supabase
        .from('agendamentos')
        .insert({ ...agendamento, tenant_id: tenant.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      queryClient.invalidateQueries({ queryKey: ['relatorios'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({ title: "Agendamento criado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar agendamento", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateAgendamento() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async ({ id, ...agendamento }: Partial<Agendamento> & { id: string }) => {
      if (!tenant?.id) throw new Error("Tenant context missing during update.");
      const { data, error } = await supabase
        .from('agendamentos')
        .update(agendamento)
        .eq('id', id)
        .eq('tenant_id', tenant.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      queryClient.invalidateQueries({ queryKey: ['relatorios'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({ title: "Agendamento atualizado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar agendamento", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteAgendamento() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenant?.id) throw new Error("Tenant context missing during deletion.");
      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenant.id);

      if (error) throw error;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      queryClient.invalidateQueries({ queryKey: ['relatorios'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({ title: "Agendamento removido com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover agendamento", description: error.message, variant: "destructive" });
    },
  });
}

// Dashboard stats
export function useDashboardStats(funcionarioId?: string, isAdmin: boolean = false) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ['dashboard-stats', tenant?.id, funcionarioId, isAdmin],
    queryFn: async () => {
      if (!tenant?.id) return { totalClientes: 0, agendamentosHoje: 0, servicosConcluidos: 0, receitaMes: 0 };

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      const firstDayOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1).toISOString();

      const { count: totalClientes } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id);

      // VIPs Ativos (com assinatura ativa)
      const { count: totalVips } = await supabase
        .from('assinaturas_clientes')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .eq('status', 'ativo');

      // Agendamentos de hoje - Se for admin, vê tudo do tenant
      let agendamentosHojeQuery = supabase
        .from('agendamentos')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .gte('data_hora', startOfDay.toISOString())
        .lte('data_hora', endOfDay.toISOString());

      if (funcionarioId && !isAdmin) {
        agendamentosHojeQuery = agendamentosHojeQuery.eq('funcionario_id', funcionarioId);
      }

      const { count: agendamentosHoje } = await agendamentosHojeQuery;

      // Serviços concluídos hoje
      let servicosConcluidosQuery = supabase
        .from('agendamentos')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .eq('status', 'concluido')
        .gte('data_hora', startOfDay.toISOString())
        .lte('data_hora', endOfDay.toISOString());

      if (funcionarioId && !isAdmin) {
        servicosConcluidosQuery = servicosConcluidosQuery.eq('funcionario_id', funcionarioId);
      }

      const { count: servicosConcluidos } = await servicosConcluidosQuery;

      // Receita do mês (apenas serviços concluídos)
      let agendamentosMesQuery = supabase
        .from('agendamentos')
        .select(`
          servico:servicos(preco),
          funcionarios!agendamentos_funcionario_id_fkey(tipo_comissao, valor_comissao, cargo)
        `)
        .eq('tenant_id', tenant.id)
        .eq('status', 'concluido')
        .gte('data_hora', firstDayOfMonth);

      if (funcionarioId && !isAdmin) {
        agendamentosMesQuery = agendamentosMesQuery.eq('funcionario_id', funcionarioId);
      }

      const { data: agendamentosMes } = await agendamentosMesQuery;

      let receitaMes = 0;
      if (agendamentosMes) {
        receitaMes = agendamentosMes.reduce((total, agendamento) => {
          const preco = agendamento.servico?.preco || 0;
          const valorComissaoFunc = Number(agendamento.funcionarios?.valor_comissao || 0);
          const tipoComissaoFunc = agendamento.funcionarios?.tipo_comissao;
          const cargoFunc = agendamento.funcionarios?.cargo;

          let comissao = 0;
          const isSalary = tipoComissaoFunc === 'valor_fixo' && (valorComissaoFunc > 500 || cargoFunc === 'recepcao');

          if (!isSalary && valorComissaoFunc >= 0) {
            if (tipoComissaoFunc === 'percentual') {
              comissao = (preco * valorComissaoFunc) / 100;
            } else {
              comissao = valorComissaoFunc;
            }
          } else if (!isSalary) {
            comissao = (preco * 30) / 100;
          }

          if (isAdmin) {
            return total + preco;
          } else {
            return total + comissao;
          }
        }, 0);
      }

      const { data: agendamentosHojeData } = await supabase
        .from('agendamentos')
        .select('servicos(preco)')
        .eq('tenant_id', tenant.id)
        .eq('status', 'concluido')
        .gte('data_hora', startOfDay.toISOString())
        .lte('data_hora', endOfDay.toISOString());

      const faturamento_hoje = agendamentosHojeData?.reduce((total, item) => total + (item.servicos?.preco || 0), 0) || 0;
      const taxa_conclusao = agendamentosHoje > 0 ? Math.round((servicosConcluidos / agendamentosHoje) * 100) : 0;

      return {
        total_clientes: totalClientes || 0,
        total_vips: totalVips || 0,
        agendamentos_hoje: agendamentosHoje || 0,
        clientes_atendidos: servicosConcluidos || 0,
        faturamento_hoje,
        receita_mes: receitaMes,
        taxa_conclusao
      };
    },
    enabled: !!tenant?.id,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });
}

// Funcionários hooks
export function useFuncionarios() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ['funcionarios', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      return data as Funcionario[];
    },
    enabled: !!tenant?.id
  });
}

export function useCreateFuncionario() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (funcionario: Omit<Funcionario, 'id' | 'created_at' | 'updated_at'> & { ativo?: boolean; password?: string }) => {
      const { password, ...funcionarioData } = funcionario;

      if (!tenant?.id) throw new Error("Tenant ID missing");

      // 1. Se tiver senha, criar usuário via Edge Function (é a forma correta e segura)
      if (password) {
        const { data: authData, error: authError } = await supabase.functions.invoke('admin-create-user', {
          body: {
            email: funcionarioData.email,
            password: password,
            nome: funcionarioData.nome,
            cargo: funcionarioData.cargo,
            nivel_acesso: funcionarioData.nivel_acesso,
            tenant_id: tenant.id
          }
        });

        if (authError) {
          let errorMessage = authError.message;
          try {
            const body = await authError.context.json();
            if (body.error) errorMessage = body.error;
          } catch (e) { /* ignore */ }
          throw new Error(errorMessage);
        }

        if (authData?.error) throw new Error(authData.error);
        return authData.user;
      }

      // 2. Se NÃO tiver senha (apenas registro de dados), faz o upsert normal na tabela funcionarios
      const { data, error } = await supabase
        .from('funcionarios')
        .upsert({
          ...funcionarioData,
          tenant_id: tenant.id,
          ativo: true
        }, { onConflict: 'email' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      toast({ title: "Membro Integrado", description: "O funcionário foi cadastrado com sucesso." });
    },
    onError: (error: any) => {
      toast({ title: "Erro no Cadastro", description: error.message, variant: "destructive" });
    }
  });
}


export function useUpdateFuncionario() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async ({ id, ...funcionario }: Partial<Funcionario> & { id: string; password?: string }) => {
      if (!tenant?.id) throw new Error("Tenant ID missing");

      const { password, ...funcionarioData } = funcionario;

      // 1. Se houver senha, atualizamos no Auth e DB via Edge Function
      if (password && password.length > 0) {
        const { data: authData, error: authError } = await supabase.functions.invoke('admin-create-user', {
          body: {
            email: funcionarioData.email,
            password: password,
            nome: funcionarioData.nome,
            cargo: funcionarioData.cargo,
            nivel_acesso: funcionarioData.nivel_acesso,
            tenant_id: tenant.id
          }
        });

        if (authError) throw authError;
        if (authData?.error) throw new Error(authData.error);
      } else {
        // 2. Apenas atualiza os dados na tabela funcionarios se não houver troca de senha
        const { error } = await supabase
          .from('funcionarios')
          .update(funcionarioData)
          .eq('id', id)
          .eq('tenant_id', tenant.id);

        if (error) throw error;

        // Sincroniza o user_roles caso o nível de acesso tenha mudado
        if (funcionarioData.nivel_acesso) {
          const role = funcionarioData.nivel_acesso === 'administrador' ? 'admin' : (funcionarioData.nivel_acesso === 'recepcionista' ? 'recepcionista' : 'funcionario');

          // Busca o user_id do funcionário para atualizar o role
          const { data: func } = await supabase.from('funcionarios').select('user_id').eq('id', id).maybeSingle();
          if (func?.user_id) {
            await supabase.from('user_roles').upsert({
              user_id: func.user_id,
              tenant_id: tenant.id,
              role: role
            }, { onConflict: 'user_id' });
          }
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      toast({ title: "Perfil Atualizado", description: "As alterações foram salvas com sucesso." });
    },
    onError: (error: any) => {
      toast({ title: "Erro na Atualização", description: error.message, variant: "destructive" });
    }
  });
}


export function useDeleteFuncionario() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenant?.id) throw new Error("Tenant ID missing");

      const { error } = await supabase
        .from('funcionarios')
        .update({ ativo: false })
        .eq('id', id)
        .eq('tenant_id', tenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      toast({ title: "Membro Removido", description: "O acesso deste funcionário foi revogado." });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    }
  });
}

// Configuracoes hooks
export function useConfiguracoes() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ['configuracoes', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      // Using RPC to bypass table visibility/cache issues
      const { data, error } = await (supabase
        .rpc('get_tenant_config', { t_id: tenant.id }) as any);

      if (error) {
        console.warn("RPC get_tenant_config failed, falling back to table query:", error);
        // Fallback para query direta se a RPC falhar
        const { data: fallback, error: fallbackError } = await supabase
          .from('tenant_settings')
          .select('*')
          .eq('tenant_id', tenant.id)
          .maybeSingle();

        if (fallbackError) throw fallbackError;
        return fallback as Configuracao | null;
      }

      // RPC returns an array, take the first one or null
      return (data?.[0] || null) as Configuracao | null;
    },
    enabled: !!tenant?.id
  });
}

export function useUpdateConfiguracoes() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (config: Partial<Configuracao> & { logo_url?: string; banner_url?: string; cor_primaria?: string; cor_secundaria?: string; fonte_primaria?: string }) => {
      if (!tenant?.id) throw new Error("Tenant ID missing");

      const rpcParams = {
        _tenant_id: tenant.id,
        _nome_barbearia: config.nome_barbearia || tenant.nome,
        _endereco: config.endereco,
        _telefone: config.telefone,
        _email: config.email,
        _horario_abertura: config.horario_abertura,
        _horario_fechamento: config.horario_fechamento,
        _dias_funcionamento: config.dias_funcionamento,
        _logo_url: config.logo_url,
        _banner_url: config.banner_url,
        _cor_primaria: config.cor_primaria,
        _cor_secundaria: config.cor_secundaria,
        _fonte_primaria: config.fonte_primaria
      };

      const { data, error } = await (supabase.rpc('upsert_tenant_config', rpcParams) as any);

      if (error) {
        console.error("RPC upsert_tenant_config failed:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes', tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      toast({ title: "Sistema atualizado!", description: "Suas personalizações foram salvas com sucesso." });
    },
  });
}

// Relatorios hook
export function useRelatorios(dataInicio: string, dataFim: string) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ['relatorios', tenant?.id, dataInicio, dataFim],
    queryFn: async () => {
      if (!tenant?.id) return { transacoes: [] } as any;
      console.log('Carregando relatórios para o período:', dataInicio, 'até', dataFim);

      // Busca todos os agendamentos no período com os dados necessários
      const { data: agendamentos, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          clientes!agendamentos_cliente_id_fkey(nome, telefone, email),
          servicos!agendamentos_servico_id_fkey(nome, preco, duracao_minutos),
          funcionarios!agendamentos_funcionario_id_fkey(
            id,
            nome,
            tipo_comissao,
            valor_comissao
          )
        `)
        .eq('tenant_id', tenant.id)
        .gte('data_hora', dataInicio)
        .lte('data_hora', dataFim + ' 23:59:59')
        .order('data_hora', { ascending: false });

      if (error) {
        console.error('Erro ao buscar agendamentos para relatórios:', error);
        throw error;
      }

      console.log('Agendamentos encontrados:', agendamentos?.length || 0);

      // Busca histórico da fila de espera
      const { data: filaHistory, error: filaError } = await supabase
        .from('fila_espera')
        .select('*')
        .eq('tenant_id', tenant.id)
        .gte('updated_at', dataInicio)
        .lte('updated_at', dataFim + ' 23:59:59')
        .order('updated_at', { ascending: false });

      if (filaError) {
        console.error('Erro ao buscar histórico da fila:', filaError);
      }

      // Busca todos os funcionários para calcular salários fixos
      const { data: allFuncionarios } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('ativo', true);

      // Processa os agendamentos para calcular valores
      const processados = (agendamentos || []).map(agendamento => {
        const servico = agendamento.servicos || { preco: 0, duracao_minutos: 0 };
        const funcionario = agendamento.funcionarios || null;

        let comissao = 0;
        let valorLiquido = servico.preco || 0;

        // Calcula a comissão se o agendamento estiver concluído e tiver funcionário
        if (agendamento.status === 'concluido' && funcionario) {
          // Se o agendamento já tem comissão gravada, usa ela
          if (agendamento.comissao_funcionario !== null && agendamento.comissao_funcionario !== undefined && Number(agendamento.comissao_funcionario) > 0) {
            comissao = Number(agendamento.comissao_funcionario);
          } else {
            // Caso contrário, calcula com base nas configurações do funcionário
            const valorComissaoFunc = Number(funcionario.valor_comissao || 0);
            const tipoComissaoFunc = funcionario.tipo_comissao;

            // LÓGICA DE SALÁRIO VS COMISSÃO:
            // Se for valor_fixo e o valor for alto (Ex: > 500) ou for recepção, NÃO é comissão por serviço.
            // É um salário fixo que será descontado no total do mês.
            const isSalary = tipoComissaoFunc === 'valor_fixo' && (valorComissaoFunc > 500 || funcionario.cargo === 'recepcao');

            if (!isSalary && valorComissaoFunc >= 0) {
              if (tipoComissaoFunc === 'percentual') {
                comissao = (servico.preco * valorComissaoFunc) / 100;
              } else {
                comissao = valorComissaoFunc;
              }
            } else if (!isSalary) {
              // Padrão: 30% caso não tenha configuração e não seja salário
              comissao = (servico.preco * 30) / 100;
            }
          }
          valorLiquido = Math.max(0, servico.preco - comissao);
        }

        return {
          ...agendamento,
          cliente: agendamento.clientes || null,
          servico: servico,
          funcionario: funcionario,
          comissao_funcionario: comissao,
          valor_liquido: valorLiquido,
          duracao_minutos: servico.duracao_minutos || 0
        };
      });

      // Filtra apenas os concluídos para os cálculos financeiros
      const concluidos = processados.filter(a => a.status === 'concluido');
      const total = processados.length;

      const faturamento_total = concluidos.reduce((sum, a) => sum + (a.servico.preco || 0), 0);
      const total_comissoes = concluidos.reduce((sum, a) => sum + (a.comissao_funcionario || 0), 0);

      // Cálculo de Salários Fixos (soma de quem tem valor_fixo > 500 ou é recepção)
      const total_salarios = (allFuncionarios || []).reduce((sum, f) => {
        const val = Number(f.valor_comissao || 0);
        if (f.tipo_comissao === 'valor_fixo' && (val > 500 || f.cargo === 'recepcao')) {
          return sum + val;
        }
        return sum;
      }, 0);

      const valor_liquido_barbearia = faturamento_total - total_comissoes - total_salarios;

      // Agrupar por serviço
      const servicosMap = new Map();
      concluidos.forEach(a => {
        const servico = a.servico?.nome || 'Não identificado';
        const preco = a.servico?.preco || 0;

        if (servicosMap.has(servico)) {
          const existing = servicosMap.get(servico);
          servicosMap.set(servico, {
            nome: servico,
            quantidade: existing.quantidade + 1,
            faturamento: existing.faturamento + preco
          });
        } else {
          servicosMap.set(servico, {
            nome: servico,
            quantidade: 1,
            faturamento: preco
          });
        }
      });

      // Agrupar por funcionário
      const funcionariosMap = new Map();
      concluidos.forEach(a => {
        const funcionario = a.funcionario?.nome || 'Não identificado';
        const faturamento = a.servico?.preco || 0;
        const comissao = a.comissao_funcionario || 0;

        if (funcionariosMap.has(funcionario)) {
          const existing = funcionariosMap.get(funcionario);
          funcionariosMap.set(funcionario, {
            nome: funcionario,
            total_servicos: existing.total_servicos + 1,
            faturamento_total: existing.faturamento_total + faturamento,
            comissao_total: existing.comissao_total + comissao
          });
        } else {
          funcionariosMap.set(funcionario, {
            nome: funcionario,
            total_servicos: 1,
            faturamento_total: faturamento,
            comissao_total: comissao
          });
        }
      });
      return {
        faturamento_total,
        total_servicos: concluidos.length,
        taxa_conclusao: total > 0 ? (concluidos.length / total) * 100 : 0,
        total_comissoes,
        total_salarios,
        valor_liquido_barbearia,
        servicos_por_tipo: Array.from(servicosMap.values()),
        comissoes_por_funcionario: Array.from(funcionariosMap.values()),
        transacoes: processados,
        fila_historico: filaHistory || []
      };
    },
  });
}

// Planos hooks
export function usePlanos() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ['planos', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('preco');
      if (error) throw error;
      return data as Plano[];
    },
    enabled: !!tenant?.id,
  });
}

export function useCreatePlano() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (plano: Omit<Plano, 'id' | 'created_at'>) => {
      if (!tenant?.id) throw new Error("Tenant não identificado.");
      const { data, error } = await supabase
        .from('planos')
        .insert({ ...plano, tenant_id: tenant.id })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Erro ao criar plano. Tente atualizar a página ou verifique permissões.");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      toast({ title: "Plano criado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar plano", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdatePlano() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async ({ id, ...plano }: Partial<Plano> & { id: string }) => {
      if (!tenant?.id) throw new Error("Tenant context missing.");
      const { data, error } = await supabase.from('planos')
        .update(plano)
        .eq('id', id)
        .eq('tenant_id', tenant.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Plano não atualizado. Verifique permissões.");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      toast({ title: "Plano atualizado!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar plano", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeletePlano() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenant?.id) throw new Error("Tenant context missing.");
      const { error } = await supabase.from('planos')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenant.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      toast({ title: "Plano removido!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover plano", description: error.message, variant: "destructive" });
    },
  });
}

// Assinaturas hooks
export function useAssinaturasCliente(clienteId?: string) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ['assinaturas', tenant?.id, clienteId],
    queryFn: async () => {
      if (!tenant?.id) return [];
      let query = supabase.from('assinaturas_clientes').select('*, plano:planos(*), cliente:clientes(*)').eq('tenant_id', tenant.id);
      if (clienteId) query = query.eq('cliente_id', clienteId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as AssinaturaCliente[];
    },
    enabled: !!tenant?.id && (!!clienteId || clienteId === undefined),
  });
}

export function useVincularPlano() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async ({ cliente_id, plano_id, cortes_iniciais, barbas_iniciais, dataInicio }: { cliente_id: string, plano_id: string, cortes_iniciais: number, barbas_iniciais: number, dataInicio: string }) => {
      const proximaRenovacao = new Date();
      proximaRenovacao.setMonth(proximaRenovacao.getMonth() + 1);

      if (!tenant?.id) throw new Error("Tenant não identificado.");

      const { data, error } = await (supabase.from('assinaturas_clientes' as any).insert({
        cliente_id,
        plano_id,
        status: 'ativo',
        cortes_restantes: Number(cortes_iniciais),
        barbas_restantes: Number(barbas_iniciais),
        data_inicio: dataInicio,
        proxima_renovacao: proximaRenovacao.toISOString(),
        tenant_id: tenant.id
      }).select() as any);

      if (error) {
        console.error('Supabase Full Error:', error);
        throw new Error(`DB: ${error.message} (Code: ${error.code})`);
      }
      return data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assinaturas'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({ title: "Plano vinculado com sucesso!" });
    },
  });
}
// Super Admin Tenant hooks
export function useTenants() {
  return useQuery({
    queryKey: ['admin-tenants'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('tenants' as any)
        .select('*')
        .order('nome') as any);
      if (error) throw error;
      return data as Tenant[];
    },
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tenant: Omit<Tenant, 'id' | 'created_at'>) => {
      const { data, error } = await (supabase
        .from('tenants' as any)
        .insert(tenant)
        .select()
        .single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      toast({ title: "Nova barbearia cadastrada!" });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...tenant }: Partial<Tenant> & { id: string }) => {
      const { data, error } = await (supabase
        .from('tenants' as any)
        .update(tenant)
        .eq('id', id)
        .select()
        .single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      toast({ title: "Barbearia atualizada!" });
    },
  });
}
