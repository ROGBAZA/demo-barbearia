import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Calendar, CheckCircle, Scissors, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgendamentoComissao {
  id: string;
  data_hora: string;
  status: string;
  clientes?: { nome: string };
  servicos?: { nome: string; preco: number };
  funcionarios?: { nome: string; valor_comissao: number; tipo_comissao: string };
}

export function Comissoes() {
  const { funcionario } = useAuth();

  // Fetch agendamentos do funcionário com comissões
  const { data: agendamentos, isLoading } = useQuery({
    queryKey: ['minhas-comissoes', funcionario?.id],
    queryFn: async () => {
      if (!funcionario?.id) return [];

      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          clientes!agendamentos_cliente_id_fkey(nome),
          servicos!agendamentos_servico_id_fkey(nome, preco),
          funcionarios!agendamentos_funcionario_id_fkey(nome, valor_comissao, tipo_comissao)
        `)
        .eq('funcionario_id', funcionario.id)
        .eq('status', 'concluido')
        .order('data_hora', { ascending: false });

      if (error) {
        console.error('Erro ao buscar comissões:', error);
        throw error;
      }
      return data as any[];
    },
    enabled: !!funcionario?.id
  });

  // Função para calcular comissão individual
  const calculateComissao = (agendamento: AgendamentoComissao) => {
    const preco = agendamento.servicos?.preco || 0;
    const valorComissaoFunc = agendamento.funcionarios?.valor_comissao;
    const tipoComissaoFunc = agendamento.funcionarios?.tipo_comissao;

    // Verifica se há configuração (pode ser 0)
    if (valorComissaoFunc !== null && valorComissaoFunc !== undefined && Number(valorComissaoFunc) >= 0) {
      if (tipoComissaoFunc === 'percentual') {
        return (preco * Number(valorComissaoFunc)) / 100;
      } else {
        return Number(valorComissaoFunc);
      }
    }

    // Padrão: 30% se não houver configuração específica
    return (preco * 30) / 100;
  };

  // Calcular estatísticas
  const stats = React.useMemo(() => {
    if (!agendamentos) return {
      totalComissoes: 0,
      totalServicos: 0,
      comissaoMes: 0,
      servicosMes: 0
    };

    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalComissoes = agendamentos.reduce((sum, a) => sum + calculateComissao(a), 0);
    const totalServicos = agendamentos.length;

    const agendamentosMes = agendamentos.filter((a) => new Date(a.data_hora) >= inicioMes);
    const comissaoMes = agendamentosMes.reduce((sum, a) => sum + calculateComissao(a), 0);
    const servicosMes = agendamentosMes.length;

    return {
      totalComissoes,
      totalServicos,
      comissaoMes,
      servicosMes
    };
  }, [agendamentos]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Minhas Comissões</h1>
          <p className="text-muted-foreground">
            Acompanhe suas comissões e ganhos
          </p>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-24 bg-muted animate-pulse rounded mb-1" />
                <div className="h-3 w-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-0">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Minhas Comissões
        </h1>
        <p className="text-muted-foreground">
          Acompanhe o detalhamento do seu salário e comissões
        </p>
      </div>

      {/* Cards de estatísticas - Grid responsivo */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissão Total</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {stats.totalComissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Total acumulado
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-gradient-to-br from-card to-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissão do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ {stats.comissaoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Mês de {format(new Date(), 'MMMM', { locale: ptBR })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-500/20 bg-gradient-to-br from-card to-orange-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Serviços Realizados</CardTitle>
            <CheckCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalServicos}</div>
            <p className="text-xs text-muted-foreground">
              Total de atendimentos
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-gradient-to-br from-card to-purple-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Serviço</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(stats.totalServicos > 0 ? stats.totalComissoes / stats.totalServicos : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Ganhos médios
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Comissões */}
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle>Histórico de Comissões</CardTitle>
          <CardDescription>
            Detalhamento de todos os serviços concluídos e suas respectivas comissões
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {agendamentos && agendamentos.length > 0 ? (
            <>
              {/* Vista Mobile (Cards) */}
              <div className="block lg:hidden space-y-4 px-4 pb-4">
                {agendamentos.map((agendamento) => {
                  const comissaoVal = calculateComissao(agendamento);
                  return (
                    <Card key={agendamento.id} className="bg-muted/30 border-none">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="text-xs font-bold uppercase text-muted-foreground">Data</p>
                            <p className="font-medium">
                              {format(new Date(agendamento.data_hora), 'dd/MM/yyyy HH:mm')}
                            </p>
                          </div>
                          <Badge variant="default" className="bg-green-500/20 text-green-700 hover:bg-green-500/30 border-none">
                            Concluído
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-muted">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground font-bold uppercase">
                              <User className="w-3 h-3" /> Cliente
                            </div>
                            <p className="text-sm font-semibold truncate">{agendamento.clientes?.nome || '-'}</p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground font-bold uppercase">
                              <Scissors className="w-3 h-3" /> Serviço
                            </div>
                            <p className="text-sm font-semibold truncate">{agendamento.servicos?.nome || '-'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-background/50 p-2 rounded-lg">
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">Valor</p>
                            <p className="text-sm font-bold">
                              R$ {Number(agendamento.servicos?.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-primary font-bold uppercase">Sua Comissão</p>
                            <p className="text-sm font-bold text-green-600">
                              R$ {comissaoVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Vista Desktop (Table) */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right text-primary">Sua Comissão</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agendamentos.map((agendamento) => {
                      const comissaoVal = calculateComissao(agendamento);
                      return (
                        <TableRow key={agendamento.id}>
                          <TableCell className="font-medium">
                            {format(new Date(agendamento.data_hora), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell>{agendamento.clientes?.nome}</TableCell>
                          <TableCell>{agendamento.servicos?.nome}</TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {Number(agendamento.servicos?.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            R$ {comissaoVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="default" className="bg-green-100 text-green-800 border-none">
                              Concluído
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Nenhuma comissão encontrada</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                Você ainda não possui serviços concluídos registrados no seu nome.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
