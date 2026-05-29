import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useFilaEspera,
  useCreateFilaEspera,
  useUpdateFilaEspera,
  useServicos,
  useFuncionarios,
  useCreateAgendamento,
  useClientes,
  useCreateCliente,
  useAssinaturasCliente,
  Funcionario
} from "@/hooks/useDatabase";
import {
  Clock,
  Users,
  UserPlus,
  Check,
  X,
  Volume2,
  Bell,
  BellOff,
  DollarSign,
  CreditCard,
  Scissors,
  Hash,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Zap,
  User,
  CalendarCheck,
  History,
  ChevronRight,
  Star,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { CardContainer, CardBody, CardItem } from "@/components/ui/card-3d";
import { Skeleton } from "@/components/ui/skeleton";

const CALL_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

import { useTenant } from "@/contexts/TenantContext";

export default function FilaEspera() {
  const { tenant } = useTenant();
  const { isGerente, isRecepcionista, isAdmin, funcionario } = useAuth();
  const isAllowed = isAdmin || isGerente || isRecepcionista || funcionario?.nivel_acesso === 'funcionario';

  const { data: fila, refetch } = useFilaEspera();
  const createEntry = useCreateFilaEspera();
  const updateStatus = useUpdateFilaEspera();

  const { data: servicos } = useServicos();
  const { data: funcionarios } = useFuncionarios();
  const { data: clientes } = useClientes();
  const createAgendamento = useCreateAgendamento();
  const { data: assinaturas } = useAssinaturasCliente();

  const [finishDialog, setFinishDialog] = useState<{ open: boolean, entry: any | null }>({ open: false, entry: null });
  const [finishData, setFinishData] = useState<{ servicoIds: string[], funcionarioId: string, preco: number, metodoPagamento: string }>({ servicoIds: [], funcionarioId: '', preco: 0, metodoPagamento: 'dinheiro' });
  const { toast } = useToast();

  const [formData, setFormData] = useState({ nome: "", telefone: "", servico_descricao: "", observacoes: "" });
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator && !wakeLockRef.current) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => { wakeLockRef.current = null; });
      } catch (err: any) { console.error(`Wake Lock Error: ${err.message}`); }
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') { requestWakeLock(); }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const channel = supabase.channel(`fila_updates_${tenant?.id || 'global'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fila_espera',
          filter: `tenant_id=eq.${tenant?.id}`
        },
        (payload: any) => {
          console.log("Real-time update received for queue:", payload.eventType);
          refetch();
          // Sound removed from admin panel
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch, tenant?.id]);

  const enableAudio = () => {
    if (!isAudioEnabled) {
      if (!audioRef.current) audioRef.current = new Audio(CALL_SOUND_URL);
      audioRef.current.play().then(() => {
        audioRef.current?.pause();
        setIsAudioEnabled(true);
        requestWakeLock();
      }).catch(e => console.log("Audio blocked", e));
    }
  };

  const playNotification = (clientName?: string) => {
    if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); }
    if ("vibrate" in navigator) { navigator.vibrate([500, 200, 500, 200, 800]); }
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("🔔 CLIENTE NA FILA!", { body: `${clientName || 'Um cliente'} foi chamado!`, renotify: true, tag: "fila-espera" });
    }
  };

  if (!isAllowed) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <CardContainer className="inter-var p-0">
          <CardBody className="bg-black/60 border-red-500/20 rounded-[3rem] p-12 text-center border backdrop-blur-3xl">
            <X className="h-20 w-20 text-red-500 mx-auto mb-6" />
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Bloqueado</h2>
            <p className="text-muted-foreground mt-4 text-lg">Acesso restrito à equipe de recepção.</p>
          </CardBody>
        </CardContainer>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome) return;
    createEntry.mutate({ ...formData, status: 'aguardando', chegada_em: new Date().toISOString() }, {
      onSuccess: () => { setFormData({ nome: "", telefone: "", servico_descricao: "", observacoes: "" }); refetch(); toast({ title: "Na Fila!", description: `${formData.nome} adicionado.` }); }
    });
  };

  const handleStatusUpdate = (id: string, status: any) => {
    updateStatus.mutate({ id, status }, { onSuccess: () => refetch() });
  };

  const handleChamar = async (id: string, nome: string) => {
    if (!tenant?.id) return;

    try {
      const { error } = await supabase
        .from('fila_espera')
        .update({
          status: 'chamado',
          updated_at: new Date().toISOString() // Força atualização do timestamp para disparar listeners
        })
        .eq('id', id)
        .eq('tenant_id', tenant.id);

      if (error) throw error;

      toast({
        title: "📢 CHAMANDO CLIENTE!",
        description: `Notificação enviada para ${nome}. O dispositivo dele vibrará.`,
        className: "bg-primary text-black font-bold"
      });

      refetch();
    } catch (err: any) {
      toast({ title: "Erro ao chamar", description: err.message, variant: "destructive" });
    }
  };

  const toggleServiceInForm = (serviceName: string) => {
    const currentServices = formData.servico_descricao ? formData.servico_descricao.split(' + ') : [];
    let newServices = currentServices.includes(serviceName) ? currentServices.filter(s => s !== serviceName) : [...currentServices, serviceName];
    setFormData({ ...formData, servico_descricao: newServices.join(' + ') });
  };

  const openFinishDialog = (entry: any) => {
    const names = (entry.servico_descricao || '').split(' + ').map((n: string) => n.trim().toLowerCase());
    let totalPreco = 0;
    let matchedIds: string[] = [];
    if (servicos) {
      names.forEach(name => {
        const s = servicos.find(serv => serv.nome.toLowerCase() === name);
        if (s) { totalPreco += Number(s.preco); matchedIds.push(s.id); }
      });
    }
    if (matchedIds.length === 0 && servicos?.[0]) { matchedIds = [servicos[0].id]; totalPreco = Number(servicos[0].preco); }
    let defaultFuncionarioId = entry.barbeiro_id || (funcionario?.id && funcionario.cargo === 'barbeiro' ? funcionario.id : (funcionarios?.[0]?.id || ''));
    let assinaturaAtiva = entry.cliente_id ? assinaturas?.find(a => a.cliente_id === entry.cliente_id && a.status === 'ativo') : null;
    setFinishData({ servicoIds: matchedIds, funcionarioId: defaultFuncionarioId, preco: totalPreco, metodoPagamento: 'dinheiro' });
    setFinishDialog({ open: true, entry: { ...entry, matchedIds, assinatura: assinaturaAtiva } });
  };

  const handleConfirmFinish = async () => {
    if (!finishDialog.entry || finishData.servicoIds.length === 0 || !finishData.funcionarioId) return;

    let clienteId = finishDialog.entry.cliente_id;
    if (!clienteId) {
      const trimmedNome = finishDialog.entry.nome.trim();
      const trimmedTelefone = finishDialog.entry.telefone?.trim() || null;

      // 1. Tentar encontrar cliente existente pelo telefone (se houver)
      if (trimmedTelefone) {
        const { data: phoneMatch } = await supabase
          .from('clientes')
          .select('id')
          .eq('telefone', trimmedTelefone)
          .maybeSingle();
        if (phoneMatch) clienteId = phoneMatch.id;
      }

      // 2. Tentar por Nome (Case Insensitive)
      if (!clienteId) {
        const { data: nameMatch } = await supabase
          .from('clientes')
          .select('id')
          .ilike('nome', trimmedNome)
          .maybeSingle();
        if (nameMatch) clienteId = nameMatch.id;
      }

      // 3. Se não achou, cria novo com tratamento de erro
      if (!clienteId) {
        if (!tenant?.id) {
          toast({ title: "Erro de Tenant", description: "Não foi possível identificar a barbearia.", variant: "destructive" });
          return;
        }

        const { data: newClient, error: insertError } = await supabase
          .from('clientes')
          .insert({
            nome: trimmedNome,
            telefone: trimmedTelefone,
            tenant_id: tenant.id
          })
          .select('id')
          .maybeSingle();

        if (insertError) {
          // Fallback final caso tenha ocorrido um conflito de última hora
          const { data: fallback } = await supabase
            .from('clientes')
            .select('id')
            .eq('tenant_id', tenant.id)
            .or(`nome.ilike.${trimmedNome}${trimmedTelefone ? `,telefone.eq.${trimmedTelefone}` : ''}`)
            .maybeSingle();

          if (fallback) {
            clienteId = fallback.id;
          } else {
            console.error(insertError);
            toast({ title: "Erro ao criar cliente", description: "Verifique os dados.", variant: "destructive" });
            return;
          }
        } else if (newClient) {
          clienteId = newClient.id;
        }
      }
    }

    if (!clienteId) return;

    for (const sId of finishData.servicoIds) {
      // Build the agendamento object conditionally to avoid DB errors
      const agendamentoData: any = {
        cliente_id: clienteId,
        servico_id: sId,
        funcionario_id: finishData.funcionarioId,
        status: 'concluido',
        data_hora: new Date().toISOString()
      };

      // Only add metodo_pagamento if it exists (to avoid DB schema errors)
      if (finishData.metodoPagamento) {
        agendamentoData.metodo_pagamento = finishData.metodoPagamento;
      }

      await createAgendamento.mutateAsync(agendamentoData);
    }
    await updateStatus.mutateAsync({ id: finishDialog.entry.id, status: 'atendido' });
    setFinishDialog({ open: false, entry: null });
    toast({ title: "Finalizado!", description: "Atendimento concluído com sucesso." });
  };

  const clientesAtivos = fila?.filter(e => e.status !== 'atendido' && e.status !== 'cancelado') || [];

  return (
    <div className="space-y-8 pb-16" onClick={enableAudio}>

      {/* Dynamic Header */}
      <section className="relative p-8 md:p-12 rounded-[3rem] bg-black/40 border border-white/5 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[150px] -z-10" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 blur-[120px] -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-lg">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">Fila Espera</h1>
                <div className="flex items-center gap-3 mt-1">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-none pulse tracking-widest text-[9px] uppercase font-black">Live Queue</Badge>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-black/40 border border-white/5 rounded-full">
                    <Volume2 className={`h-3 w-3 ${isAudioEnabled ? 'text-emerald-500' : 'text-red-500'}`} />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{isAudioEnabled ? 'Audio Live' : 'Audio Blocked'}</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-lg text-muted-foreground font-medium max-w-xl">Gerencie a porta da Route 66 com agilidade tecnológica e alto padrão de recepção.</p>
          </motion.div>

          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="bg-white/[0.03] border border-white/5 p-6 rounded-[2rem] backdrop-blur-3xl flex items-center gap-6">
              <div className="text-center">
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1">Aguardando</p>
                <p className="text-4xl font-black text-white leading-none">{clientesAtivos.length}</p>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <Button onClick={enableAudio} className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all ${isAudioEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary text-black animate-pulse shadow-gold'}`}>
                {isAudioEnabled ? <Bell className="h-6 w-6" /> : <BellOff className="h-6 w-6" />}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Entry Form - Architectural Card */}
        <div className="lg:col-span-4 space-y-8">
          <CardContainer className="inter-var w-full p-0">
            <CardBody className="bg-gradient-to-br from-black/60 to-black/20 backdrop-blur-3xl border-white/5 rounded-[3rem] p-8 border hover:shadow-2xl transition-all relative overflow-hidden h-auto">
              <CardItem translateZ="50" className="w-full mb-8">
                <h3 className="text-2xl font-black text-white flex items-center gap-3">
                  <UserPlus className="h-6 w-6 text-primary" /> Novo Check-in
                </h3>
              </CardItem>

              <form onSubmit={handleSubmit} className="space-y-6">
                <CardItem translateZ="40" className="w-full space-y-6">
                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-2">Identidade do Cliente</Label>
                    <Input value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })}
                      className="h-16 bg-black border-white/10 rounded-2xl px-6 text-lg focus:border-primary/50 transition-all" placeholder="Nome do VIP" required />
                  </div>
                  <div className="space-y-4">
                    <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-2">Especialidades</Label>
                    <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                      {servicos?.map(s => (
                        <button key={s.id} type="button" onClick={() => toggleServiceInForm(s.nome)}
                          className={`p-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${formData.servico_descricao?.split(' + ').includes(s.nome) ? 'bg-primary text-black border-primary shadow-gold' : 'bg-white/5 text-muted-foreground border-white/5 hover:bg-white/10'}`}>
                          {s.nome}
                        </button>
                      ))}
                    </div>
                    <Input value={formData.servico_descricao} onChange={e => setFormData({ ...formData, servico_descricao: e.target.value })}
                      className="h-12 bg-black border-white/5 rounded-xl px-4 text-xs opacity-50" placeholder="Custom Service..." />
                  </div>
                </CardItem>

                <CardItem translateZ="80" className="w-full pt-4">
                  <Button type="submit" disabled={createEntry.isPending} className="w-full h-18 bg-primary text-black font-black text-xl rounded-[1.8rem] shadow-gold hover:opacity-90 active:scale-95 transition-all">
                    {createEntry.isPending ? <Loader2 className="animate-spin" /> : "Inserir na Fila VIP"}
                  </Button>
                </CardItem>
              </form>
            </CardBody>
          </CardContainer>
        </div>

        {/* Live Queue Architecture */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-2xl font-black text-white flex items-center gap-4">
              <Clock className="w-8 h-8 text-primary" /> Fluxo de Atendimento
            </h3>
          </div>

          <div className="grid gap-6">
            <AnimatePresence mode="popLayout">
              {clientesAtivos.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center border-2 border-dashed border-white/10 rounded-[3rem] bg-white/[0.02]">
                  <Users className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-20" />
                  <h4 className="text-xl font-bold text-muted-foreground/40 uppercase tracking-[0.3em]">Nenhum VIP Aguardando</h4>
                </motion.div>
              ) : (
                clientesAtivos.map((entry, idx) => (
                  <motion.div key={entry.id} layout initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                    <CardContainer className="inter-var w-full p-0">
                      <CardBody className={`relative group/card backdrop-blur-3xl rounded-[2.5rem] p-6 border transition-all flex flex-col md:flex-row items-center justify-between gap-6 ${entry.status === 'chamado' ? 'bg-primary/20 border-primary shadow-gold ring-2 ring-primary/20' : 'bg-black/40 border-white/5 hover:border-white/20'}`}>

                        <div className="flex items-center gap-6 w-full md:w-auto">
                          <CardItem translateZ="100" className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-xl shrink-0 ${entry.status === 'chamado' ? 'bg-black text-primary animate-pulse' : 'bg-white/5 text-muted-foreground border border-white/10'}`}>
                            {entry.status === 'chamado' ? <Volume2 className="h-8 w-8" /> : idx + 1}
                          </CardItem>
                          <CardItem translateZ="50" className="flex-1 overflow-hidden">
                            <h4 className="text-2xl font-black text-white group-hover/card:text-primary transition-colors truncate">{entry.nome}</h4>
                            <div className="flex items-center gap-3 mt-1.5">
                              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-white/10 bg-white/5">{entry.servico_descricao || 'N/A'}</Badge>
                              <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-primary" /> {format(new Date(entry.chegada_em), "HH:mm")}
                              </span>
                            </div>
                          </CardItem>
                        </div>

                        <CardItem translateZ="60" className="flex items-center gap-3 w-full md:w-auto">
                          {(entry.status === 'aguardando' || entry.status === 'chamado') && (
                            <Button
                              onClick={() => handleChamar(entry.id, entry.nome)}
                              className={`flex-1 md:flex-none h-14 px-8 font-black uppercase tracking-widest text-[10px] rounded-2xl border transition-all ${entry.status === 'chamado'
                                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-black border-amber-500/40 animate-pulse'
                                : 'bg-primary/10 text-primary hover:bg-primary hover:text-black border-primary/20'
                                }`}
                            >
                              {entry.status === 'chamado' ? '🔔 Chamar Novamente' : 'Chamar Agora'}
                            </Button>
                          )}
                          {entry.status === 'chamado' && (
                            <Button onClick={() => handleStatusUpdate(entry.id, 'em_atendimento')} className="flex-1 md:flex-none h-14 px-8 bg-white/10 text-white hover:bg-white hover:text-black font-black uppercase tracking-widest text-[10px] rounded-2xl border border-white/10 transition-all">
                              Confirmar Entrada
                            </Button>
                          )}
                          <div className="flex gap-2">
                            <Button onClick={() => openFinishDialog(entry)} size="icon" variant="ghost" className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-lg">
                              <Check className="h-6 w-6" />
                            </Button>
                            <Button onClick={() => handleStatusUpdate(entry.id, 'cancelado')} size="icon" variant="ghost" className="h-14 w-14 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all">
                              <X className="h-6 w-6" />
                            </Button>
                          </div>
                        </CardItem>
                      </CardBody>
                    </CardContainer>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Modern Financial Settlement Dialog */}
      <Dialog open={finishDialog.open} onOpenChange={(open) => !open && setFinishDialog(prev => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-xl bg-zinc-950 border-white/10 text-white backdrop-blur-3xl rounded-[3rem] p-0 shadow-[0_0_80px_rgba(16,185,129,0.1)] flex flex-col max-h-[95vh] sm:max-h-[90vh]">
          <div className="p-8 pb-6 border-b border-white/5 bg-emerald-500/5 shrink-0">
            <DialogTitle className="text-2xl md:text-3xl font-black flex items-center gap-4">
              <DollarSign className="h-10 w-10 text-emerald-500 p-2 bg-emerald-500/10 rounded-2xl" />
              Concluir & Cobrar
            </DialogTitle>
            <DialogDescription className="text-emerald-400/60 text-[10px] md:text-xs uppercase font-black tracking-widest">Atendimento: {finishDialog.entry?.nome}</DialogDescription>
          </div>

          <div className="p-8 space-y-8 bg-white/[0.02] overflow-y-auto custom-scrollbar flex-1">
            <div className="space-y-4">
              <Label className="uppercase text-[10px] tracking-[0.3em] font-black text-white/40 ml-2">Serviços Executados</Label>
              <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {servicos?.map(s => {
                  const isSelected = finishData.servicoIds.includes(s.id);
                  return (
                    <button key={s.id} onClick={() => {
                      const next = isSelected ? finishData.servicoIds.filter(id => id !== s.id) : [...finishData.servicoIds, s.id];
                      const nextPrice = servicos.filter(sv => next.includes(sv.id)).reduce((a, b) => a + Number(b.preco), 0);
                      setFinishData(v => ({ ...v, servicoIds: next, preco: nextPrice }));
                    }} className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${isSelected ? 'bg-emerald-500/20 border-emerald-500 shadow-xl' : 'bg-white/5 border-white/5 text-muted-foreground'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'}`}>
                          {isSelected && <Check className="h-3 w-3 text-black" />}
                        </div>
                        <span className="text-sm font-bold">{s.nome}</span>
                      </div>
                      <span className="text-xs font-black">R$ {Number(s.preco).toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 items-end">
              <div className="space-y-2">
                <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-2">Profissional</Label>
                <Select value={finishData.funcionarioId} onValueChange={v => setFinishData({ ...finishData, funcionarioId: v })}>
                  <SelectTrigger className="h-14 bg-black border-white/10 rounded-2xl px-6"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
                    {funcionarios?.filter(f => f.cargo === 'barbeiro' || f.cargo === 'gerente').map(f => (<SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em] mb-2">Total a Cobrar</p>
                <p className="text-3xl md:text-4xl font-black text-white">R$ {finishData.preco.toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-white/5 pb-4">
              <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-2">Forma de Pagamento</Label>
              <div className="grid grid-cols-3 gap-3">
                {['dinheiro', 'pix', 'cartao'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setFinishData({ ...finishData, metodoPagamento: method })}
                    className={`h-12 md:h-14 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest border transition-all ${finishData.metodoPagamento === method ? 'bg-emerald-500 text-black border-emerald-500 scale-105 shadow-gold' : 'bg-white/5 text-muted-foreground border-white/5 hover:bg-white/10'}`}
                  >
                    {method === 'dinheiro' ? '💵 Dinheiro' : method === 'pix' ? '📱 Pix' : '💳 Cartão'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-8 pt-4 border-t border-white/5 bg-black/20 shrink-0">
            <Button onClick={handleConfirmFinish} className="w-full h-16 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xl rounded-2xl shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-tight">
              Confirmar Pagamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
