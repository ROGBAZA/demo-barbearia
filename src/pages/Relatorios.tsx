import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Calendar,
  TrendingUp,
  DollarSign,
  Users,
  Scissors,
  Filter,
  Download,
  Trash2,
  History,
  RotateCcw,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Zap,
  ChevronRight,
  Search,
  PieChart,
  BarChart
} from 'lucide-react';
import { useRelatorios, useUpdateAgendamento, useDeleteAgendamento } from '@/hooks/useDatabase';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, TextRun, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, AlignmentType, HeadingLevel, ImageRun, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';
import { CardContainer, CardBody, CardItem } from '@/components/ui/card-3d';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenant } from '@/contexts/TenantContext';

export default function Relatorios() {
  const [dateRange, setDateRange] = useState({
    inicio: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    fim: format(new Date(), 'yyyy-MM-dd')
  });

  const [pendingDateRange, setPendingDateRange] = useState({
    inicio: dateRange.inicio,
    fim: dateRange.fim
  });

  const { isGerente } = useAuth();
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const updateAgendamento = useUpdateAgendamento();
  const deleteAgendamento = useDeleteAgendamento();
  const [resetLoading, setResetLoading] = useState(false);

  const handleResetPeriodo = async () => {
    toast({ title: "Recurso Restrito", description: "O reset de histórico requer permissão Master Admin.", variant: "destructive" });
  };

  const handleReverterStatus = async (id: string) => {
    try {
      await updateAgendamento.mutateAsync({ id, status: 'agendado' });
      toast({ title: "Status Revertido", description: "Atendimento revertido para agendado." });
      queryClient.invalidateQueries({ queryKey: ['relatorios'] });
    } catch (e) {
      toast({ title: "Erro ao reverter", variant: "destructive" });
    }
  };

  const { data: relatorios, isLoading } = useRelatorios(dateRange.inicio, dateRange.fim);

  const applyFilters = () => {
    setDateRange({ inicio: pendingDateRange.inicio, fim: pendingDateRange.fim });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  const exportToExcel = async () => {
    if (!relatorios) return;
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Geral');
    ws.addRow(['Relatório Financeiro - Route 66']);
    ws.addRow([`Período: ${formatDate(dateRange.inicio)} - ${formatDate(dateRange.fim)}`]);
    ws.addRow([]);
    ws.addRow(['Faturamento Bruto', relatorios.faturamento_total]);
    ws.addRow(['Total Comissões', relatorios.total_comissoes]);
    ws.addRow(['Resultado Líquido', relatorios.valor_liquido_barbearia]);
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Relatorio_Route66.xlsx`);
    toast({ title: "Excel Exportado" });
  };

  const exportToWord = async () => {
    if (!relatorios) return;
    const doc = new Document({
      sections: [{ children: [new Paragraph("Relatório de Desempenho Route 66")] }]
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Relatorio_Route66.docx`);
    toast({ title: "Word Exportado" });
  };

  if (isLoading) {
    return (
      <div className="space-y-8 p-6">
        <Skeleton className="h-64 w-full rounded-[3.5rem] bg-white/5" />
        <div className="grid grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-3xl bg-white/5" />)}
        </div>
      </div>
    );
  }

  const kpis = [
    { title: "Faturamento Bruto", value: formatCurrency(relatorios?.faturamento_total || 0), icon: DollarSign, color: "primary", description: "Entrada total bruta" },
    { title: "Serviços Efetuados", value: relatorios?.total_servicos || 0, icon: Scissors, color: "blue-400", description: "Atendimentos finalizados" },
    { title: "Total a Pagar", value: formatCurrency((relatorios?.total_comissoes || 0) + (relatorios?.total_salarios || 0)), icon: Users, color: "red-400", description: "Comissões + Folha" },
    { title: "Lucro Líquido", value: formatCurrency(relatorios?.valor_liquido_barbearia || 0), icon: TrendingUp, color: "emerald-400", description: "Resultado da unidade" },
  ];

  return (
    <div className="space-y-8 pb-16">

      {/* Cinematic Header with Filter Control */}
      <section className="relative p-6 md:p-16 rounded-[4rem] bg-black/40 border border-white/5 overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 blur-3xl" style={{ backgroundImage: `radial-gradient(circle at 10% 10%, hsl(var(--primary) / 0.2) 0%, transparent 50%)` }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/10 blur-[150px] -z-10" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 relative z-10">
          <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <div className="flex items-center gap-6 mb-6">
              <div className="p-5 bg-primary/10 rounded-[2rem] border border-primary/20 shadow-lg group">
                <TrendingUp className="h-12 w-12 text-primary group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter leading-none">Inteligência</h1>
                <div className="flex items-center gap-3 mt-2">
                  <Badge className="bg-white/5 text-primary border-primary/20 tracking-[0.2em] text-[10px] uppercase font-black px-4 py-1">Business Analytics</Badge>
                  <span className="text-[10px] font-black text-muted-foreground uppercase opacity-40">Period: {formatDate(dateRange.inicio)} - {formatDate(dateRange.fim)}</span>
                </div>
              </div>
            </div>
            <p className="text-xl text-muted-foreground font-medium max-w-xl">Métricas de alta performance para impulsionar o lucro e a eficiência operacional da <span className="text-white font-black italic">Route 66</span>.</p>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col sm:flex-row gap-4 bg-white/[0.03] p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl shrink-0">
            <div className="space-y-4">
              <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-2">Janela de Tempo</Label>
              <div className="flex gap-4">
                <Input type="date" value={pendingDateRange.inicio} onChange={(e) => setPendingDateRange({ ...pendingDateRange, inicio: e.target.value })} className="h-14 bg-black border-white/10 rounded-2xl px-6 text-sm" />
                <Input type="date" value={pendingDateRange.fim} onChange={(e) => setPendingDateRange({ ...pendingDateRange, fim: e.target.value })} className="h-14 bg-black border-white/10 rounded-2xl px-6 text-sm" />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1 rounded-xl text-[10px] font-black uppercase text-primary border border-primary/10 hover:bg-primary/10" onClick={() => { const today = format(new Date(), 'yyyy-MM-dd'); setPendingDateRange({ inicio: today, fim: today }); applyFilters(); }}>Hoje</Button>
                <Button variant="ghost" className="flex-1 rounded-xl text-[10px] font-black uppercase border border-white/5 hover:bg-white/5" onClick={() => { const start = format(startOfMonth(new Date()), 'yyyy-MM-dd'); setPendingDateRange({ inicio: start, fim: format(new Date(), 'yyyy-MM-dd') }); applyFilters(); }}>Mês</Button>
                <Button onClick={applyFilters} className="flex-[2] bg-primary text-black font-black uppercase text-xs rounded-xl shadow-gold hover:opacity-90">Analisar Dados</Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* KPI 3D Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {kpis.map((kpi, idx) => (
          <motion.div key={kpi.title} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
            <CardContainer className="inter-var w-full p-0">
              <CardBody className="bg-black/40 border border-white/5 rounded-[2.5rem] p-8 hover:shadow-2xl transition-all relative overflow-hidden group">
                <div className={`p-4 w-14 h-14 rounded-2xl bg-${kpi.color}/10 flex items-center justify-center mb-8`}>
                  <kpi.icon className={`h-7 w-7 text-${kpi.color}`} />
                </div>
                <h3 className="text-4xl font-black text-white mb-2 tracking-tighter">{kpi.value}</h3>
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{kpi.title}</p>
                <div className="mt-4 flex items-center gap-2">
                  <Zap className={`h-3 w-3 text-${kpi.color} animate-pulse`} />
                  <span className="text-[10px] font-bold text-muted-foreground/40">{kpi.description}</span>
                </div>
                <div className={`absolute -bottom-8 -right-8 w-32 h-32 bg-${kpi.color}/5 rounded-full blur-3xl opacity-50 group-hover:scale-150 transition-transform duration-700`} />
              </CardBody>
            </CardContainer>
          </motion.div>
        ))}
      </div>

      {/* Action Center Table Container */}
      <div className="bg-white/[0.02] border border-white/5 rounded-[3.5rem] p-6 md:p-10 backdrop-blur-3xl shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
          <h3 className="text-3xl font-black text-white flex items-center gap-4">
            <History className="h-8 w-8 text-primary" /> Relatório Detalhado
          </h3>
          <div className="flex gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-14 px-8 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 gap-3 font-bold text-sm">
                  <Download className="h-5 w-5 text-primary" /> Exportar Inteligência
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-950 border-white/10 text-white rounded-2xl p-2 shadow-2xl">
                <DropdownMenuItem onClick={exportToExcel} className="h-14 rounded-xl gap-3 cursor-pointer focus:bg-white/5 font-bold"><FileSpreadsheet className="h-5 w-5 text-emerald-500" /> Excel Spreadsheet</DropdownMenuItem>
                <DropdownMenuItem onClick={exportToWord} className="h-14 rounded-xl gap-3 cursor-pointer focus:bg-white/5 font-bold"><FileText className="h-5 w-5 text-blue-400" /> Word Document</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {isGerente && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/10 hover:bg-red-500 hover:text-white transition-all">
                    <RotateCcw className="h-6 w-6" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-zinc-950 border-white/10 text-white rounded-[3rem] p-10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-3xl font-black">Resetar Período?</AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400 text-lg">
                      Deseja realmente apagar <span className="text-white font-bold">{(relatorios?.transacoes?.length || 0)} registros</span> deste intervalo? Esta operação é irreversível e afetará o financeiro.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-8 gap-4">
                    <AlertDialogCancel className="h-16 px-8 rounded-2xl bg-transparent border-white/10">Abortar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetPeriodo} className="h-16 px-10 rounded-2xl bg-red-500 text-white font-black shadow-lg shadow-red-500/20">Sim, Limpar Tudo</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div className="min-w-[800px] rounded-[2.5rem] border border-white/5 bg-black/40 overflow-hidden">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/5 hover:bg-transparent h-16">
                  <TableHead className="text-primary font-black uppercase text-[10px] tracking-widest pl-10">Data Atendimento</TableHead>
                  <TableHead className="text-muted-foreground font-black uppercase text-[10px] tracking-widest">VIP / Cliente</TableHead>
                  <TableHead className="text-muted-foreground font-black uppercase text-[10px] tracking-widest">Especialista</TableHead>
                  <TableHead className="text-muted-foreground font-black uppercase text-[10px] tracking-widest">Investimento</TableHead>
                  <TableHead className="text-right pr-10">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(relatorios?.transacoes || []).map((t: any, idx: number) => (
                  <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.01 }} className="border-b border-white/5 hover:bg-white/[0.02] group transition-all">
                    <TableCell className="pl-10 py-6">
                      <span className="text-white font-bold text-sm">{format(new Date(t.data_hora), 'dd/MM/yyyy')}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{format(new Date(t.data_hora), 'HH:mm')}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-white font-black text-sm uppercase tracking-tight">{t.cliente?.nome || 'N/A'}</span>
                        <span className="text-[10px] text-primary font-bold">{t.servico?.nome || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-muted-foreground">
                          {t.funcionario?.nome?.charAt(0)}
                        </div>
                        <span className="text-zinc-400 font-medium text-sm">{t.funcionario?.nome || 'Staff'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-emerald-400 font-black text-base">{formatCurrency(t.servico?.preco || 0)}</span>
                    </TableCell>
                    <TableCell className="text-right pr-10">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-10 w-10 text-muted-foreground hover:text-white hover:bg-white/10" onClick={() => handleReverterStatus(t.id)}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-10 w-10 text-red-400 hover:text-red-500 hover:bg-red-500/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-zinc-950 border-white/10 text-white rounded-[2rem]">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Registro?</AlertDialogTitle>
                              <AlertDialogDescription className="text-zinc-400">
                                Esta ação removerá permanentemente este serviço do histórico financeiro.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl border-white/10">Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteAgendamento.mutate(t.id)} className="bg-red-500 hover:bg-red-600 rounded-xl font-bold text-white">
                                Sim, Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
