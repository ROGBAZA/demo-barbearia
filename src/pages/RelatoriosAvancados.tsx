import { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { RelatorioPDFContent } from '@/components/RelatorioPDFContent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import {
    TrendingUp,
    Users,
    Calendar,
    DollarSign,
    Download,
    FileText,
    BarChart3,
} from 'lucide-react';
import { useAgendamentos, useServicos, useFuncionarios } from '@/hooks/useDatabase';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['#EAB308', '#3B82F6', '#10B981', '#F97316', '#8B5CF6', '#EC4899'];

export default function Relatorios() {
    const { toast } = useToast();
    const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

    const { data: agendamentos, isLoading: loadingAgendamentos } = useAgendamentos();
    const { data: servicos, isLoading: loadingServicos } = useServicos();
    const { data: funcionarios, isLoading: loadingFuncionarios } = useFuncionarios();

    const isLoading = loadingAgendamentos || loadingServicos || loadingFuncionarios;

    // Filtrar agendamentos por período
    const agendamentosFiltrados = agendamentos?.filter((ag) => {
        const dataAg = ag.data_hora.split('T')[0];
        return dataAg >= dataInicio && dataAg <= dataFim;
    }) || [];

    // Agendamentos concluídos
    const agendamentosConcluidos = agendamentosFiltrados.filter(
        (ag) => ag.status === 'concluido'
    );

    // 1. RECEITA TOTAL
    const receitaTotal = agendamentosConcluidos.reduce(
        (sum, ag) => sum + (ag.valor_final || 0),
        0
    );

    // 2. SERVIÇOS MAIS VENDIDOS
    const servicosPorQuantidade = agendamentosConcluidos.reduce((acc, ag) => {
        const servicoNome = ag.servico?.nome || 'Sem serviço';
        acc[servicoNome] = (acc[servicoNome] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const dadosServicosMaisVendidos = Object.entries(servicosPorQuantidade)
        .map(([nome, quantidade]) => ({ nome, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);

    // 3. PERFORMANCE POR BARBEIRO
    const performanceBarbeiros = funcionarios
        ?.filter((f) => f.cargo === 'barbeiro')
        .map((barbeiro) => {
            const agendamentosBarbeiro = agendamentosConcluidos.filter(
                (ag) => ag.funcionario_id === barbeiro.id
            );
            const receita = agendamentosBarbeiro.reduce((sum, ag) => sum + (ag.valor_final || 0), 0);
            const comissao = agendamentosBarbeiro.reduce(
                (sum, ag) => sum + (ag.comissao_calculada || 0),
                0
            );
            return {
                nome: barbeiro.nome,
                atendimentos: agendamentosBarbeiro.length,
                receita,
                comissao,
            };
        })
        .sort((a, b) => b.receita - a.receita) || [];

    // 4. AGENDAMENTOS POR DIA
    const agendamentosPorDia = eachDayOfInterval({
        start: new Date(dataInicio),
        end: new Date(dataFim),
    }).map((dia) => {
        const dataStr = format(dia, 'yyyy-MM-dd');
        const count = agendamentosFiltrados.filter(
            (ag) => ag.data_hora.split('T')[0] === dataStr
        ).length;
        return {
            dia: format(dia, 'dd/MM', { locale: ptBR }),
            agendamentos: count,
        };
    });

    // 5. DISTRIBUIÇÃO DE STATUS
    const statusDistribuicao = agendamentosFiltrados.reduce((acc, ag) => {
        const status = ag.status || 'pendente';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const dadosStatus = Object.entries(statusDistribuicao).map(([status, quantidade]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: quantidade,
    }));



    const exportarExcel = () => {
        // Criar CSV simples
        const header = ['Data', 'Cliente', 'Barbeiro', 'Serviço', 'Valor', 'Status'];
        const rows = agendamentosFiltrados.map((ag) => [
            format(new Date(ag.data_hora), 'dd/MM/yyyy HH:mm'),
            ag.cliente?.nome || 'N/A',
            ag.funcionario?.nome || 'N/A',
            ag.servico?.nome || 'N/A',
            `R$ ${(ag.valor_final || 0).toFixed(2)}`,
            ag.status,
        ]);

        const csv = [header, ...rows].map((row) => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio-${dataInicio}-${dataFim}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        toast({
            title: '✅ Relatório Exportado',
            description: 'Arquivo CSV baixado com sucesso!',
        });
    };

    if (isLoading) {
        return (
            <div className="space-y-8 p-6">
                <Skeleton className="h-48 w-full rounded-[3rem] bg-white/5" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-64 rounded-3xl bg-white/5" />
                    <Skeleton className="h-64 rounded-3xl bg-white/5" />
                    <Skeleton className="h-64 rounded-3xl bg-white/5" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-16">
            {/* Header */}
            <div className="bg-black/40 border border-white/5 rounded-[3rem] p-8 md:p-12 backdrop-blur-3xl shadow-2xl">
                <div className="flex items-center gap-6 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                        <BarChart3 className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter">
                            Relatórios Avançados
                        </h1>
                        <p className="text-muted-foreground mt-1 font-medium">
                            Análise completa de performance e resultados
                        </p>
                    </div>
                </div>

                {/* Filtros de Data */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label className="text-white">Data Início</Label>
                        <Input
                            type="date"
                            value={dataInicio}
                            onChange={(e) => setDataInicio(e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-white">Data Fim</Label>
                        <Input
                            type="date"
                            value={dataFim}
                            onChange={(e) => setDataFim(e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                        />
                    </div>


                    <div className="flex gap-2 items-end">
                        <Button
                            onClick={exportarExcel}
                            className="flex-1 bg-primary text-black font-bold hover:bg-primary/90"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Excel
                        </Button>
                        <PDFDownloadLink
                            document={
                                <RelatorioPDFContent
                                    dataInicio={dataInicio}
                                    dataFim={dataFim}
                                    receitaTotal={receitaTotal}
                                    agendamentosCount={agendamentosConcluidos.length}
                                    performanceBarbeiros={performanceBarbeiros}
                                    resumoServicos={dadosServicosMaisVendidos}
                                />
                            }
                            fileName={`relatorio-${dataInicio}-${dataFim}.pdf`}
                            className="flex-1"
                        >
                            {({ loading }) => (
                                <Button
                                    variant="outline"
                                    className="w-full border-primary text-primary hover:bg-primary/10"
                                    disabled={loading}
                                >
                                    <FileText className="h-4 w-4 mr-2" />
                                    {loading ? 'Gerando...' : 'PDF'}
                                </Button>
                            )}
                        </PDFDownloadLink>
                    </div>
                </div>
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-black/60 border-white/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Receita Total
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-primary">
                            R$ {receitaTotal.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {agendamentosConcluidos.length} agendamentos concluídos
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-black/60 border-white/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Total de Agendamentos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-white">
                            {agendamentosFiltrados.length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">No período selecionado</p>
                    </CardContent>
                </Card>

                <Card className="bg-black/60 border-white/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Barbeiros Ativos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-white">
                            {performanceBarbeiros.filter((b) => b.atendimentos > 0).length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Com atendimentos</p>
                    </CardContent>
                </Card>

                <Card className="bg-black/60 border-white/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Ticket Médio
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-white">
                            R${' '}
                            {agendamentosConcluidos.length > 0
                                ? (receitaTotal / agendamentosConcluidos.length).toFixed(2)
                                : '0.00'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Por agendamento</p>
                    </CardContent>
                </Card>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Agendamentos por Dia */}
                <Card className="bg-black/60 border-white/5">
                    <CardHeader>
                        <CardTitle className="text-white">Agendamentos por Dia</CardTitle>
                        <CardDescription>Volume diário de agendamentos</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={agendamentosPorDia}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis dataKey="dia" stroke="#888" />
                                <YAxis stroke="#888" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#000',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                    }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="agendamentos"
                                    stroke="#EAB308"
                                    strokeWidth={3}
                                    dot={{ fill: '#EAB308', r: 5 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Serviços Mais Vendidos */}
                <Card className="bg-black/60 border-white/5">
                    <CardHeader>
                        <CardTitle className="text-white">Serviços Mais Vendidos</CardTitle>
                        <CardDescription>Top 5 serviços do período</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={dadosServicosMaisVendidos}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis dataKey="nome" stroke="#888" />
                                <YAxis stroke="#888" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#000',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="quantidade" fill="#EAB308" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Performance por Barbeiro */}
                <Card className="bg-black/60 border-white/5">
                    <CardHeader>
                        <CardTitle className="text-white">Performance por Barbeiro</CardTitle>
                        <CardDescription>Receita gerada por profissional</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={performanceBarbeiros} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis type="number" stroke="#888" />
                                <YAxis dataKey="nome" type="category" stroke="#888" width={100} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#000',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="receita" fill="#10B981" radius={[0, 8, 8, 0]} />
                                <Bar dataKey="comissao" fill="#3B82F6" radius={[0, 8, 8, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Distribuição de Status */}
                <Card className="bg-black/60 border-white/5">
                    <CardHeader>
                        <CardTitle className="text-white">Distribuição de Status</CardTitle>
                        <CardDescription>Status dos agendamentos</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={dadosStatus}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry) => `${entry.name}: ${entry.value}`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {dadosStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#000',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela Detalhada de Barbeiros */}
            <Card className="bg-black/60 border-white/5">
                <CardHeader>
                    <CardTitle className="text-white">Detalhamento por Barbeiro</CardTitle>
                    <CardDescription>Métricas detalhadas de cada profissional</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left py-4 px-4 text-white font-bold">Barbeiro</th>
                                    <th className="text-right py-4 px-4 text-white font-bold">Atendimentos</th>
                                    <th className="text-right py-4 px-4 text-white font-bold">Receita</th>
                                    <th className="text-right py-4 px-4 text-white font-bold">Comissão</th>
                                    <th className="text-right py-4 px-4 text-white font-bold">Ticket Médio</th>
                                </tr>
                            </thead>
                            <tbody>
                                {performanceBarbeiros.map((barbeiro, idx) => (
                                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="py-4 px-4 text-white">{barbeiro.nome}</td>
                                        <td className="text-right py-4 px-4 text-muted-foreground">
                                            {barbeiro.atendimentos}
                                        </td>
                                        <td className="text-right py-4 px-4 text-primary font-bold">
                                            R$ {barbeiro.receita.toFixed(2)}
                                        </td>
                                        <td className="text-right py-4 px-4 text-blue-400">
                                            R$ {barbeiro.comissao.toFixed(2)}
                                        </td>
                                        <td className="text-right py-4 px-4 text-muted-foreground">
                                            R${' '}
                                            {barbeiro.atendimentos > 0
                                                ? (barbeiro.receita / barbeiro.atendimentos).toFixed(2)
                                                : '0.00'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
