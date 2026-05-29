import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  Info,
  User,
  Clock,
  Scissors,
  DollarSign,
  Calendar as CalendarIcon,
  FileText,
  Search,
  Phone,
  MessageSquare,
  Volume2,
  Filter,
  Sparkles,
  ChevronRight,
  Zap,
  History,
  CalendarCheck
} from "lucide-react";
import { useConcluirAgendamento } from "@/hooks/useAgendamentoActions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { CardContainer, CardBody, CardItem } from "@/components/ui/card-3d";
import { Skeleton } from "@/components/ui/skeleton";

interface Agendamento {
  id: string;
  cliente_id: string;
  servico_id: string;
  funcionario_id: string;
  data_hora: string;
  status: 'agendado' | 'concluido' | 'cancelado' | 'chamado';
  observacoes?: string;
  created_at: string;
  updated_at: string;
  cliente?: {
    id: string;
    nome: string;
    telefone: string;
    email: string;
  };
  servico?: {
    id: string;
    nome: string;
    preco: number;
    duracao_minutos: number;
  };
  funcionario?: {
    id: string;
    nome: string;
    foto_url?: string;
  };
}

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string;
}

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
}

interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
  ativo: boolean;
  foto_url: string | null;
}

import { useTenant } from "@/contexts/TenantContext";

export default function Agendamentos() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailAgendamento, setDetailAgendamento] = useState<Agendamento | null>(null);
  const { toast } = useToast();
  const { isAdmin, isGerente, funcionario } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const { mutate: concluirAgendamento } = useConcluirAgendamento(userRole || undefined);

  const formatDateTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return dateStr;
    }
  };

  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterDateEnd, setFilterDateEnd] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const canManage = isAdmin || isGerente || funcionario?.nivel_acesso === 'recepcionista' || funcionario?.nivel_acesso === 'funcionario';

  const [formData, setFormData] = useState({
    cliente_id: "",
    servico_id: "",
    funcionario_id: "",
    data_hora: "",
    observacoes: "",
    status: "agendado" as const
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (tenant?.id) loadData();
  }, [filterStatus, tenant?.id]);

  useEffect(() => {
    if (tenant?.id) loadData();
  }, [tenant?.id]);

  const loadData = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const { data: agendamentosData, error: agendamentosError } = await supabase
        .from('agendamentos')
        .select(`
          *,
          cliente:clientes(id, nome, telefone, email),
          servico:servicos(id, nome, preco, duracao_minutos),
          funcionario:funcionarios!agendamentos_funcionario_id_fkey(id, nome, foto_url)
        `)
        .eq('tenant_id', tenant.id)
        .order('data_hora', { ascending: false });

      if (agendamentosError) throw agendamentosError;

      let filtered = agendamentosData || [];

      if (!isAdmin && !isGerente && funcionario && funcionario.nivel_acesso !== 'recepcionista') {
        filtered = filtered.filter(a => a.funcionario_id === funcionario.id);
      }

      if (filterStatus !== "todos") {
        filtered = filtered.filter(a => a.status === filterStatus);
      }

      if (filterDate) {
        filtered = filtered.filter(a => {
          const appointmentDate = a.data_hora.split('T')[0];
          if (filterDateEnd) {
            return appointmentDate >= filterDate && appointmentDate <= filterDateEnd;
          }
          return appointmentDate === filterDate;
        });
      } else if (filterDateEnd) {
        filtered = filtered.filter(a => a.data_hora.split('T')[0] <= filterDateEnd);
      }

      const { data: clientesData } = await supabase.from('clientes').select('*').eq('tenant_id', tenant.id).order('nome');
      const { data: servicosData } = await supabase.from('servicos').select('*').eq('tenant_id', tenant.id).order('nome');
      const { data: funcionariosData } = await supabase.from('funcionarios').select('id, nome, cargo, ativo, foto_url').eq('tenant_id', tenant.id).eq('ativo', true).order('nome');

      setAgendamentos(filtered);
      setClientes(clientesData || []);
      setServicos(servicosData || []);
      setFuncionarios(funcionariosData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ title: "Erro", description: "Falha ao carregar agendamentos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleNovoAgendamento = () => {
    setSelectedAgendamento(null);
    setFormData({
      cliente_id: "",
      servico_id: "",
      funcionario_id: funcionario?.id || "",
      data_hora: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      observacoes: "",
      status: "agendado"
    });
    setIsDialogOpen(true);
  };

  const handleEditar = (agendamento: Agendamento) => {
    setSelectedAgendamento(agendamento);
    setFormData({
      cliente_id: agendamento.cliente_id,
      servico_id: agendamento.servico_id,
      funcionario_id: agendamento.funcionario_id,
      data_hora: format(new Date(agendamento.data_hora), "yyyy-MM-dd'T'HH:mm"),
      observacoes: agendamento.observacoes || "",
      status: agendamento.status
    });
    setIsDialogOpen(true);
  };

  const handleSalvar = async () => {
    if (!formData.cliente_id || !formData.servico_id || !formData.funcionario_id || !formData.data_hora || !tenant?.id) {
      toast({ title: "Campos obrigatórios", description: "Preencha todos os dados.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedAgendamento) {
        const { error } = await supabase
          .from('agendamentos')
          .update({
            cliente_id: formData.cliente_id,
            servico_id: formData.servico_id,
            funcionario_id: formData.funcionario_id,
            data_hora: new Date(formData.data_hora).toISOString(),
            status: formData.status,
            observacoes: formData.observacoes
          })
          .eq('id', selectedAgendamento.id)
          .eq('tenant_id', tenant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('agendamentos')
          .insert({
            cliente_id: formData.cliente_id,
            servico_id: formData.servico_id,
            funcionario_id: formData.funcionario_id,
            data_hora: new Date(formData.data_hora).toISOString(),
            status: formData.status,
            observacoes: formData.observacoes,
            tenant_id: tenant.id
          });
        if (error) throw error;
      }

      setIsDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      loadData();
      toast({ title: "Sucesso", description: "Agenda atualizada." });
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmarExclusao = async () => {
    if (!selectedAgendamento || !tenant?.id) return;
    try {
      const { error } = await supabase.from('agendamentos').delete().eq('id', selectedAgendamento.id).eq('tenant_id', tenant.id);
      if (error) throw error;
      setIsAlertOpen(false);
      loadData();
      toast({ title: "Excluído", description: "Agendamento removido." });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao excluir.", variant: "destructive" });
    }
  };

  const handleConcluir = async (id: string) => {
    concluirAgendamento({ id, status: 'concluido' }, {
      onSuccess: () => loadData()
    });
  };

  const handleChamar = async (id: string) => {
    if (!tenant?.id) return;
    try {
      const { error } = await supabase.from('agendamentos')
        .update({ status: 'chamado', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenant.id);
      if (error) throw error;
      loadData();
      toast({ title: "🔔 Chamado!", description: "Cliente notificado." });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao chamar.", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: any = {
      agendado: { label: 'Agendado', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      chamado: { label: 'Chamando', class: 'bg-primary text-black animate-pulse border-none font-black shadow-[0_0_15px_rgba(234,179,8,0.5)]' },
      concluido: { label: 'Concluído', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
      cancelado: { label: 'Cancelado', class: 'bg-red-500/10 text-red-400 border-red-500/20' }
    };
    const current = configs[status] || configs.agendado;
    return (
      <Badge className={`uppercase tracking-widest text-[9px] font-black px-3 py-1 ${current.class}`}>
        {current.label}
      </Badge>
    );
  };

  // Helper for final filtering by search term (local)
  const finalAgendamentos = agendamentos.filter(a =>
    a.cliente?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.servico?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && agendamentos.length === 0) {
    return (
      <div className="space-y-8 p-6">
        <div className="flex justify-between items-end">
          <Skeleton className="h-10 w-48 bg-white/5" />
          <Skeleton className="h-12 w-40 bg-white/5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-[2.5rem] bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <section className="relative p-8 md:p-12 rounded-[3rem] bg-black/40 border border-white/5 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 blur-[120px] -z-10" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 blur-[150px] -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-lg">
                <CalendarCheck className="h-10 w-10 text-blue-400" />
              </div>
              <div>
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">Agenda</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em]">Fluxo Operacional</p>
                </div>
              </div>
            </div>
            <p className="text-lg text-muted-foreground font-medium max-w-xl">Gerencie compromissos, acompanhe o histórico e maximize a produtividade da sua equipe.</p>
          </motion.div>

          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={handleNovoAgendamento} className="h-16 px-10 bg-gradient-gold text-black font-black text-lg rounded-[1.5rem] shadow-gold border-0 gap-3 group">
              <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
              Novo Agendamento
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Filters Overlay Bar */}
      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 backdrop-blur-xl shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-4 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar cliente ou serviço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-14 pl-12 bg-white/5 border-white/10 rounded-2xl focus:border-primary/50 text-base"
            />
          </div>

          <div className="lg:col-span-2 space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-white/10 text-white">
                <SelectItem value="todos font-bold">Todos</SelectItem>
                <SelectItem value="agendado">Agendados</SelectItem>
                <SelectItem value="chamado">Chamando</SelectItem>
                <SelectItem value="concluido">Concluídos</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-2 space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Início</Label>
            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl" />
          </div>

          <div className="lg:col-span-2 space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Fim</Label>
            <Input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl" />
          </div>

          <div className="lg:col-span-2 flex gap-2">
            <Button onClick={loadData} className="h-14 flex-1 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-bold">
              <Filter className="h-4 w-4 mr-2 text-primary" /> Filtrar
            </Button>
            {(filterStatus !== "todos" || filterDate || filterDateEnd || searchTerm) && (
              <Button variant="ghost" size="icon" onClick={() => { setFilterStatus("todos"); setFilterDate(""); setFilterDateEnd(""); setSearchTerm(""); }} className="h-14 w-14 rounded-2xl hover:bg-red-500/10 text-red-400">
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <AnimatePresence mode="popLayout">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {finalAgendamentos.map((agendamento, idx) => (
            <motion.div
              key={agendamento.id}
              layout
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => { setDetailAgendamento(agendamento); setIsDetailsOpen(true); }}
              className="cursor-pointer"
            >
              <CardContainer className="inter-var w-full p-0">
                <CardBody className={`bg-gradient-to-br from-black/60 to-black/20 backdrop-blur-3xl relative group/card border-white/5 w-full h-auto rounded-[2.5rem] p-8 border hover:shadow-2xl transition-all ${agendamento.status === 'chamado' ? 'border-primary/40 shadow-primary/10' : 'hover:border-white/20'}`}>

                  {/* Floating Professional Image */}
                  <CardItem translateZ="100" className="absolute -top-4 -right-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary shadow-2xl relative">
                      {agendamento.funcionario?.foto_url ? (
                        <img src={agendamento.funcionario.foto_url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#111] flex items-center justify-center">
                          <User className="h-8 w-8 text-primary/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                  </CardItem>

                  <CardItem translateZ="50" className="w-full mb-6">
                    <div className="flex items-center justify-between mb-4">
                      {getStatusBadge(agendamento.status)}
                      <div className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1.5">
                        <History className="h-3 w-3" />
                        {format(new Date(agendamento.created_at), "dd MMM")}
                      </div>
                    </div>
                    <h3 className="text-2xl font-black text-white break-words group-hover:text-primary transition-colors">
                      {agendamento.cliente?.nome || 'Anônimo'}
                    </h3>
                    <p className="text-xs font-bold text-muted-foreground mb-4">{agendamento.cliente?.telefone || 'Sem contato'}</p>
                  </CardItem>

                  <CardItem translateZ="70" className="w-full space-y-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Scissors className="h-4 w-4 text-primary" />
                          <span className="font-bold text-sm text-white">{agendamento.servico?.nome}</span>
                        </div>
                        <span className="text-emerald-400 font-black">R$ {Number(agendamento.servico?.preco || 0).toFixed(0)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {format(new Date(agendamento.data_hora), "HH:mm")} • {agendamento.servico?.duracao_minutos} min
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex gap-2">
                        {agendamento.status === 'agendado' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); handleChamar(agendamento.id); }}
                            className="h-11 w-11 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-black transition-all"
                          >
                            <Volume2 className="h-5 w-5" />
                          </Button>
                        )}
                        {(agendamento.status === 'agendado' || agendamento.status === 'chamado') && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); handleConcluir(agendamento.id); }}
                            className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all font-bold text-xs"
                          >
                            <Check className="h-5 w-5" />
                          </Button>
                        )}
                      </div>

                      <div className="flex gap-1">
                        {canManage && (
                          <>
                            <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEditar(agendamento); }} className="h-10 w-10 text-muted-foreground hover:text-white"><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedAgendamento(agendamento); setIsAlertOpen(true); }} className="h-10 w-10 text-muted-foreground hover:text-red-400"><Trash2 className="h-4 w-4" /></Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardItem>
                </CardBody>
              </CardContainer>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {/* Empty State */}
      {finalAgendamentos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <CalendarCheck className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-bold text-white">Nenhum compromisso agendado</h3>
          <p className="text-muted-foreground mt-2 max-w-xs">Tire uma folga ou adicione um novo agendamento manualmente.</p>
          <Button onClick={handleNovoAgendamento} className="mt-8 bg-primary text-black font-black px-8 py-6 rounded-2xl h-auto">Criar Agora</Button>
        </div>
      )}

      {/* Modern Dialogs */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[650px] bg-zinc-950 border-white/10 text-white backdrop-blur-3xl p-0 overflow-hidden rounded-[2rem]">
          <div className="p-8 pb-4">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-primary" />
                {selectedAgendamento ? 'Refinar Agendamento' : 'Novo Agendamento'}
              </DialogTitle>
              <DialogDescription className="text-zinc-400">Esculpa o próximo horário de estilo com precisão.</DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-8 py-6 bg-white/[0.02] border-y border-white/5 grid gap-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-1">Cliente VIP</Label>
                <Select value={formData.cliente_id} onValueChange={(v) => setFormData(f => ({ ...f, cliente_id: v }))}>
                  <SelectTrigger className="h-14 bg-black border-white/10 rounded-2xl px-6"><SelectValue placeholder="Selecionar Cliente" /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-1">Serviço de Assinatura</Label>
                <Select value={formData.servico_id} onValueChange={(v) => setFormData(f => ({ ...f, servico_id: v }))}>
                  <SelectTrigger className="h-14 bg-black border-white/10 rounded-2xl px-6"><SelectValue placeholder="Selecionar Serviço" /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
                    {servicos.map(s => <SelectItem key={s.id} value={s.id}>{s.nome} - R$ {s.preco}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-1">Profissional Responsável</Label>
                <Select value={formData.funcionario_id} onValueChange={(v) => setFormData(f => ({ ...f, funcionario_id: v }))}>
                  <SelectTrigger className="h-14 bg-black border-white/10 rounded-2xl px-6"><SelectValue placeholder="Selecionar Barbeiro" /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
                    {funcionarios.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-1">Horário & Data</Label>
                <Input type="datetime-local" value={formData.data_hora} onChange={(e) => setFormData(f => ({ ...f, data_hora: e.target.value }))} className="h-14 bg-black border-white/10 rounded-2xl px-6" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-1">Observações Técnicas</Label>
              <Textarea value={formData.observacoes} onChange={(e) => setFormData(f => ({ ...f, observacoes: e.target.value }))} placeholder="Ex: Cabelo seco, prefere tesoura no topo..." className="bg-black border-white/10 rounded-2xl min-h-[100px] p-6" />
            </div>
          </div>

          <div className="p-8 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-14 px-8 rounded-2xl font-bold">Cancelar</Button>
            <Button onClick={handleSalvar} disabled={isSubmitting} className="h-14 px-12 bg-primary text-black font-black rounded-2xl shadow-gold hover:opacity-90">
              {isSubmitting ? 'Processando...' : selectedAgendamento ? 'Atualizar Registro' : 'Confirmar Agenda'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10 text-white backdrop-blur-3xl rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <div className="relative h-32 bg-gradient-to-br from-primary/20 via-blue-500/10 to-transparent">
            <div className="absolute bottom-0 left-8 translate-y-1/2 p-1 bg-[#090b10] rounded-[1.5rem] border-4 border-[#090b10]">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/5 flex items-center justify-center border border-white/10">
                {detailAgendamento?.funcionario?.foto_url ? (
                  <img src={detailAgendamento.funcionario.foto_url} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-primary/40" />
                )}
              </div>
            </div>
            <div className="absolute top-6 right-6">
              {detailAgendamento && getStatusBadge(detailAgendamento.status)}
            </div>
          </div>

          <div className="p-8 pt-16 space-y-6">
            <div>
              <h2 className="text-3xl font-black text-white mb-1">{detailAgendamento?.cliente?.nome}</h2>
              <p className="text-sm font-bold text-primary tracking-widest uppercase">{detailAgendamento?.servico?.nome}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Data & Hora</Label>
                <p className="text-sm font-bold mt-1">{detailAgendamento && formatDateTime(detailAgendamento.data_hora)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Valor do Corte</Label>
                <p className="text-sm font-bold mt-1 text-emerald-400">R$ {Number(detailAgendamento?.servico?.preco || 0).toFixed(2)}</p>
              </div>
            </div>

            <div className="flex gap-3">
              {detailAgendamento?.cliente?.telefone && (
                <>
                  <a href={`tel:${detailAgendamento.cliente.telefone.replace(/\D/g, '')}`} className="flex-1 h-14 rounded-2xl bg-blue-500 text-white flex items-center justify-center gap-2 font-black shadow-lg shadow-blue-500/20 hover:scale-105 transition-all">
                    <Phone className="h-5 w-5" /> Ligar
                  </a>
                  <a href={`https://wa.me/55${detailAgendamento.cliente.telefone.replace(/\D/g, '')}`} target="_blank" className="flex-1 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center gap-2 font-black shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all">
                    <MessageSquare className="h-5 w-5" /> Zap
                  </a>
                </>
              )}
            </div>

            {detailAgendamento?.observacoes && (
              <div className="p-5 rounded-2xl bg-white/5 border border-dashed border-white/10">
                <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-2 block">Dossiê Técnico</Label>
                <p className="text-sm italic text-muted-foreground leading-relaxed">&ldquo;{detailAgendamento.observacoes}&rdquo;</p>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-4">
              {detailAgendamento?.status === 'agendado' && (
                <Button onClick={() => { handleConcluir(detailAgendamento!.id); setIsDetailsOpen(false); }} className="h-16 rounded-[1.2rem] bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-lg gap-2 shadow-xl shadow-emerald-500/10 active:scale-95 transition-all">
                  <Check className="h-6 w-6" /> Concluir Atendimento
                </Button>
              )}
              <Button variant="ghost" onClick={() => setIsDetailsOpen(false)} className="h-14 rounded-2xl font-bold">Fechar Detalhes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Feedback */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="bg-zinc-950 border-white/10 text-white rounded-[2rem] p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-3xl font-black">Apagar Registro?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-lg">
              Esta ação é definitiva. O agendamento de <span className="text-white font-bold">{selectedAgendamento?.cliente?.nome}</span> será removido da base de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="h-14 px-8 rounded-2xl bg-transparent border-white/10 hover:bg-white/5 font-bold">Manter Agenda</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarExclusao} className="h-14 px-8 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black shadow-lg shadow-red-500/20">Remover Permanentemente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
