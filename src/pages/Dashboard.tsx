import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Calendar, ChevronDown, Clock, Check, User, DollarSign,
  Activity, Scissors, Users, Bell, Pencil, Sparkles, Crown, CheckCircle2, Volume2, Share, Copy, Zap, ArrowRight
} from 'lucide-react';
import {
  useDashboardStats,
  useFilaEspera,
  useAgendamentosHoje,
  useUpdateFuncionario,
  useServicos,
  useFuncionarios,
  useCreateAgendamento
} from "@/hooks/useDatabase";
import logoPng from '@/assets/logo.png';
import logoJpg from '@/assets/logoooo.jpg';
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DashboardCliente from "./DashboardCliente";
import { useTenant } from "@/contexts/TenantContext";
import { ScrollArea } from "@/components/ui/scroll-area";

const CALL_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

export default function Dashboard() {
  const { isCliente, isAdmin, isGerente, isRecepcionista, funcionario } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats } = useDashboardStats(
    funcionario?.id,
    isAdmin || isGerente || isRecepcionista
  );

  const { data: fila, isLoading: isFilaLoading, refetch: refetchFila } = useFilaEspera();
  const { data: agendamentosHoje, isLoading: isAgendamentosLoading } = useAgendamentosHoje(
    (isAdmin || isGerente || isRecepcionista) ? undefined : funcionario?.id
  );
  const { data: servicos } = useServicos();
  const { data: funcionarios } = useFuncionarios();

  const createAgendamento = useCreateAgendamento();
  const updateFuncionario = useUpdateFuncionario();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showConcluirDialog, setShowConcluirDialog] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [valorCobrado, setValorCobrado] = useState(0);
  const [selectedServicos, setSelectedServicos] = useState<string[]>([]);
  const [selectedFuncionario, setSelectedFuncionario] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [isConcluding, setIsConcluding] = useState(false);

  const handleShare = () => {
    const shopUrl = tenant?.slug ? `${window.location.origin}/${tenant.slug}` : window.location.origin;
    navigator.clipboard.writeText(shopUrl);
    toast({
      title: "Link da Barbearia Copiado!",
      description: "Compartilhe este link com seus clientes.",
    });
  };

  function playNotification(message: string) {
    if (audioRef.current && notificationsEnabled) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log("Audio blocked", e));
    }

    if ("vibrate" in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    if ("Notification" in window && Notification.permission === "granted" && notificationsEnabled) {
      new Notification("🔔 MOVIMENTAÇÃO NA FILA", {
        body: message,
        icon: "/favicon.ico",
        tag: "dashboard-notif"
      });
    }
  }

  function enableAudio() {
    if (!notificationsEnabled) {
      setNotificationsEnabled(true);
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          toast({
            title: "Alertas Ativados",
            description: "Avisos sonoros habilitados.",
          });
        }).catch(e => console.log("Audio enable failed", e));
      }
    }
  }

  const handleChamar = async (id: string) => {
    try {
      const { error } = await supabase
        .from('fila_espera')
        .update({ status: 'chamado', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenant?.id);

      if (error) throw error;

      refetchFila();
      toast({ title: "📢 Chamando!", description: "Sinal sonoro enviado." });
    } catch (error: any) {
      toast({ title: "Erro ao chamar", description: error.message, variant: "destructive" });
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('fila_espera')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenant?.id);

      if (error) throw error;
      refetchFila();
    } catch (error: any) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    }
  };

  // Real-time Notification listener
  useEffect(() => {
    if (isCliente) return; // Only for staff

    const channel = supabase.channel(`dashboard_updates_${tenant?.id || 'global'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fila_espera',
          filter: `tenant_id=eq.${tenant?.id}`
        },
        (payload: any) => {
          playNotification(`Novo cliente entrou na fila: ${payload.new.nome}`);
          queryClient.invalidateQueries({ queryKey: ['fila-espera', tenant?.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fila_espera',
          filter: `tenant_id=eq.${tenant?.id}`
        },
        (payload: any) => {
          if (payload.new.status === 'chamado') {
            playNotification(`Chamando cliente: ${payload.new.nome}`);
          }
          queryClient.invalidateQueries({ queryKey: ['fila-espera', tenant?.id] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient, isCliente, tenant?.id]);

  // Effect to redirect to the correct tenant URL if at root
  useEffect(() => {
    if (window.location.pathname === '/' && tenant?.slug) {
      navigate(`/t/${tenant.slug}/dashboard`, { replace: true });
    }
  }, [tenant, navigate]);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Audio notification setup
  useEffect(() => {
    audioRef.current = new Audio(CALL_SOUND_URL);
    audioRef.current.volume = 0.7;
  }, []);

  // FINAL RENDER CHECK: Render client dashboard if user is a client
  if (isCliente) {
    return <DashboardCliente />;
  }

  // Handle photo upload
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !funcionario?.id) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${funcionario.id}-${Date.now()}.${fileExt}`;
    const filePath = `funcionarios/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateFuncionario.mutateAsync({
        id: funcionario.id,
        foto_url: publicUrl
      });

      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: ['funcionario'] });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const openConcluirDialog = (item: any) => {
    setSelectedCliente(item);
    setFormaPagamento("pix"); // Default a PIX

    // Tentar pré-selecionar serviço
    if (item.servico_id) {
      setSelectedServicos([item.servico_id]);
      const s = servicos?.find(sv => sv.id === item.servico_id);
      if (s) setValorCobrado(Number(s.preco));
    } else if (item.servico_descricao && servicos) {
      // Split by ' + ' and trim
      const searchedNames = item.servico_descricao.split(' + ').map((n: string) => n.trim().toLowerCase());

      // Filter services that match ANY of the names, but ensuring we don't pick duplicates of the same service
      const matched = servicos.filter(s => searchedNames.includes(s.nome.toLowerCase()));

      // Use a Map to ensure we only pick one service ID for each name searched
      const uniqueMatchedMap = new Map();
      matched.forEach(s => {
        const nameKey = s.nome.toLowerCase();
        if (!uniqueMatchedMap.has(nameKey)) {
          uniqueMatchedMap.set(nameKey, s);
        }
      });

      const uniqueMatched = Array.from(uniqueMatchedMap.values());
      setSelectedServicos(uniqueMatched.map(m => m.id));
      setValorCobrado(uniqueMatched.reduce((acc, curr) => acc + Number(curr.preco), 0));
    } else {
      setSelectedServicos([]);
      setValorCobrado(0);
    }

    // Pré-selecionar funcionário
    const defaultFunc = item.funcionario_id || item.barbeiro_id || (funcionario?.id && funcionario.cargo !== 'recepcao' ? funcionario.id : "");
    setSelectedFuncionario(defaultFunc);

    setShowConcluirDialog(true);
  };

  // Handle service completion
  const handleConcluirAtendimento = async () => {
    if (!selectedCliente || selectedServicos.length === 0 || !selectedFuncionario || !formaPagamento) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione pelo menos um serviço, funcionário e forma de pagamento",
        variant: "destructive"
      });
      return;
    }

    setIsConcluding(true);
    try {
      let clienteId = selectedCliente.cliente_id;

      // Se não tem cliente_id (ex: veio da fila de espera sem cadastro), tentar identificar
      if (!clienteId) {
        const nome = selectedCliente.nome || selectedCliente.clientes?.nome;
        const telefone = selectedCliente.telefone || selectedCliente.clientes?.telefone;

        // Tentar buscar por telefone
        if (telefone) {
          const { data: phoneMatch } = await supabase.from('clientes').select('id').eq('telefone', telefone).maybeSingle();
          if (phoneMatch) clienteId = phoneMatch.id;
        }

        // Tentar buscar por nome
        if (!clienteId && nome) {
          const { data: nameMatch } = await supabase.from('clientes').select('id').ilike('nome', nome).maybeSingle();
          if (nameMatch) clienteId = nameMatch.id;
        }

        // Se ainda não tem, criar
        if (!clienteId && nome && tenant?.id) {
          console.log("Tentando criar cliente:", { nome, telefone, tenant_id: tenant.id });

          const { data: newClient, error: insertError } = await supabase
            .from('clientes')
            .insert({
              nome: nome,
              telefone: telefone || null,
              tenant_id: tenant.id // CRÍTICO: Vincular ao tenant atual
            })
            .select('id')
            .maybeSingle();

          if (insertError) {
            console.error("Erro ao criar cliente:", insertError);
            // Fallback: tentar achar um cliente existente que possa ter dado conflito
            const { data: finalFallback } = await supabase
              .from('clientes')
              .select('id')
              .eq('tenant_id', tenant.id)
              .ilike('nome', nome)
              .maybeSingle();

            if (finalFallback) clienteId = finalFallback.id;
            else throw new Error(`Erro ao criar cliente automaticamente: ${insertError.message}`);
          } else if (newClient) {
            clienteId = newClient.id;
          }
        }
      }

      if (!clienteId) throw new Error("Não foi possível identificar ou criar o cliente.");

      // Criar registros na agendamentos para cada serviço (se for o caso de fila de espera)
      // Ou atualizar o agendamento existente e criar outros se tiver mais servicos selecionados
      const isFromFila = !!selectedCliente.chegada_em;

      if (isFromFila) {
        for (const sId of selectedServicos) {
          const s = servicos?.find(sv => sv.id === sId);
          await createAgendamento.mutateAsync({
            cliente_id: clienteId,
            servico_id: sId,
            funcionario_id: selectedFuncionario,
            status: 'concluido',
            data_hora: new Date().toISOString(),
            valor_cobrado: s ? Number(s.preco) : 0,
            forma_pagamento: formaPagamento
          });
        }
        // Marcar item da fila como atendido
        await supabase.from('fila_espera').update({ status: 'atendido' }).eq('id', selectedCliente.id);
      } else {
        // É um agendamento existente
        const firstServiceId = selectedServicos[0];
        const otherServiceIds = selectedServicos.slice(1);
        const s0 = servicos?.find(sv => sv.id === firstServiceId);

        // Atualizar o principal
        const { error: updateError } = await supabase
          .from('agendamentos')
          .update({
            status: 'concluido',
            servico_id: firstServiceId,
            funcionario_id: selectedFuncionario,
            valor_cobrado: s0 ? Number(s0.preco) : (valorCobrado / selectedServicos.length),
            forma_pagamento: formaPagamento,
            concluido_em: new Date().toISOString(),
            tenant_id: tenant?.id
          })
          .eq('id', selectedCliente.id);

        if (updateError) throw updateError;

        // Criar os extras
        for (const sId of otherServiceIds) {
          const s = servicos?.find(sv => sv.id === sId);
          await createAgendamento.mutateAsync({
            cliente_id: clienteId,
            servico_id: sId,
            funcionario_id: selectedFuncionario,
            status: 'concluido',
            data_hora: new Date().toISOString(),
            valor_cobrado: s ? Number(s.preco) : 0,
            forma_pagamento: formaPagamento
          });
        }
      }

      toast({
        title: "Atendimento concluído!",
        description: `Serviço finalizado com sucesso. Total: R$ ${valorCobrado.toFixed(2)}`,
      });

      setShowConcluirDialog(false);
      setSelectedCliente(null);
      setSelectedServicos([]);
      setValorCobrado(0);
      setFormaPagamento("");
      queryClient.invalidateQueries({ queryKey: ['agendamentos-hoje'] });
      queryClient.invalidateQueries({ queryKey: ['fila-espera'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    } catch (error: any) {
      toast({
        title: "Erro ao concluir",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsConcluding(false);
    }
  };

  // Stats cards configuration
  const statsCards = [
    {
      title: "Agenda de Hoje",
      value: (stats as any)?.agendamentos_hoje || 0,
      icon: Calendar,
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-cyan-400",
      trend: "+12%",
      trendUp: true
    },
    {
      title: "Faturamento Hoje",
      value: `R$ ${(stats as any)?.faturamento_hoje?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      gradient: "from-yellow-500/20 to-orange-500/20",
      iconColor: "text-yellow-400",
      trend: "+8%",
      trendUp: true
    },
    {
      title: "Finalizados",
      value: (stats as any)?.clientes_atendidos || 0,
      icon: Users,
      gradient: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-400",
      trend: "+5%",
      trendUp: true
    },
    {
      title: "Taxa de Sucesso",
      value: `${(stats as any)?.taxa_conclusao || 0}%`,
      icon: Activity,
      gradient: "from-green-500/20 to-emerald-500/20",
      iconColor: "text-green-400",
      trend: "+3%",
      trendUp: true
    }
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#020305] text-foreground p-4 md:p-8 selection:bg-primary/30" onClick={enableAudio}>

      {/* Cinematic Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full animate-pulse opacity-40" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-600/5 blur-[150px] rounded-full opacity-40" />
        <div className="absolute top-[30%] left-[20%] w-[30%] h-[30%] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-7xl mx-auto space-y-12 relative z-10"
      >
        {/* Cinematic Header */}
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-black/40 backdrop-blur-3xl p-8 lg:p-12 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] group"
        >
          {/* Header Image Background Decor */}
          <div className="absolute inset-0 z-0 opacity-10 group-hover:opacity-20 transition-opacity duration-[3s]">
            <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black z-10" />
            <img
              src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070"
              alt="Decor"
              className="w-full h-full object-cover grayscale brightness-50"
            />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <Crown className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Status: VIP Established</span>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-[2rem] bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-[2px] shadow-gold shrink-0">
                  <div className="w-full h-full rounded-[1.9rem] bg-black/40 backdrop-blur-md flex items-center justify-center overflow-hidden border border-white/5">
                    <img
                      src={tenant?.logo_url || logoJpg || logoPng}
                      alt="Logo"
                      className="w-12 h-12 md:w-16 md:h-16 object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/logo.png";
                      }}
                    />
                  </div>
                </div>
                <h1 className="text-5xl lg:text-7xl font-black text-white italic uppercase tracking-tighter leading-none">
                  {tenant?.nome || "Dashboard"}
                </h1>
              </div>
              <p className="text-zinc-400 text-lg font-medium max-w-md">
                Bem-vindo de volta ao templo, <span className="text-white font-black italic">{funcionario?.nome || 'Profissional'}</span>. Seu dia está apenas começando.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 mt-6">
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="h-12 px-6 rounded-2xl bg-white/5 border-white/10 text-white font-bold hover:bg-white/10 transition-all gap-2"
                >
                  <Share className="w-4 h-4 text-primary" />
                  Compartilhar Barbearia
                </Button>
                <Button
                  onClick={() => {
                    if (tenant?.slug) {
                      navigate(`/t/${tenant.slug}/qrcode`);
                    } else {
                      navigate('/qrcode');
                    }
                  }}
                  variant="ghost"
                  className="h-12 px-6 rounded-2xl text-zinc-400 font-bold hover:text-white transition-all gap-2"
                >
                  <Users className="w-4 h-4" />
                  Divulgação (QR Code)
                </Button>
              </div>
            </div>

            {/* Profile Photo Circular with Animated Border */}
            <div className="relative group">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] bg-gradient-to-br from-primary via-primary-glow to-amber-700 p-[3px] shadow-gold relative"
              >
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer block w-full h-full rounded-[2.4rem] bg-[#020305] overflow-hidden relative"
                >
                  {funcionario?.foto_url ? (
                    <img
                      src={funcionario.foto_url}
                      alt="Perfil"
                      className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-10 h-10 text-zinc-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <Pencil className="w-6 h-6 text-black" />
                  </div>
                </label>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Banner de Upgrade no Dashboard (Sênior Implementation) */}
        {tenant?.plano !== 'PROFISSIONAL' && (isAdmin || isGerente) && (
          <motion.div
            variants={itemVariants}
            className="p-[2px] rounded-[2.5rem] bg-gradient-gold shadow-gold relative overflow-hidden group"
          >
            <div className="bg-[#020305] rounded-[2.4rem] p-8 md:p-10 flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -z-10 animate-pulse" />
              <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 group-hover:rotate-12 transition-transform">
                  <Zap className="w-10 h-10 text-primary shadow-gold" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase italic">Desbloqueie o Poder Total</h2>
                  <p className="text-zinc-400 font-medium max-w-xl">
                    Seu período de teste oferece apenas uma fração do que a Barba & Arte pode oferecer.
                    Ative o <span className="text-primary font-bold">Plano Profissional</span> agora e tenha acesso a funcionários ilimitados, relatórios VIP e mais.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  if (tenant?.slug) {
                    navigate(`/t/${tenant.slug}/configuracoes?tab=assinatura`);
                  } else {
                    navigate('/configuracoes?tab=assinatura');
                  }
                }}
                className="h-20 px-12 bg-primary text-black font-black text-xl rounded-2xl shadow-gold hover:scale-[1.05] active:scale-[0.95] transition-all shrink-0 w-full lg:w-auto"
              >
                ASSINAR AGORA
                <ArrowRight className="w-6 h-6 ml-3" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Stats Grid - Premium Styling */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat) => (
            <motion.div
              key={stat.title}
              variants={itemVariants}
              whileHover="hover"
              initial="rest"
            >
              <Card className="relative overflow-hidden border-white/5 bg-zinc-900/40 backdrop-blur-xl shadow-2xl hover:border-primary/20 transition-all duration-500">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-20`} />
                <CardContent className="relative p-7">
                  <div className="flex items-start justify-between mb-6">
                    <div className={`p-4 rounded-2xl bg-[#020305] border border-white/5 ${stat.iconColor}`}>
                      <stat.icon className="w-7 h-7" />
                    </div>
                    <Badge variant="outline" className={`${stat.trendUp ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5' : 'text-rose-400 border-rose-400/20 bg-rose-400/5'} px-3 py-1 font-bold`}>
                      {stat.trend}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-2">
                    {stat.title}
                  </h3>
                  <p className="text-4xl font-black text-white italic tracking-tighter">
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Appointments Today */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card className="border-white/5 bg-zinc-900/20 backdrop-blur-3xl shadow-3xl overflow-hidden">
              <CardContent className="p-0">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-4">
                    <Calendar className="w-8 h-8 text-primary" />
                    Agenda de Hoje
                  </h2>
                  <Button
                    onClick={() => {
                      if (tenant?.slug) {
                        navigate(`/t/${tenant.slug}/agendamentos`);
                      } else {
                        navigate('/agendamentos');
                      }
                    }}
                    variant="link"
                    className="text-primary font-black uppercase tracking-widest text-xs h-auto p-0 hover:text-white transition-colors"
                  >
                    Ver Tudo
                    <ChevronDown className="w-4 h-4 ml-2 rotate-[-90deg]" />
                  </Button>
                </div>

                <div className="p-8">
                  <ScrollArea className="h-[500px] pr-4">
                    {isAgendamentosLoading ? (
                      <div className="space-y-6">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-28 w-full rounded-3xl bg-white/5" />
                        ))}
                      </div>
                    ) : agendamentosHoje && agendamentosHoje.length > 0 ? (
                      <div className="space-y-6">
                        {agendamentosHoje.map((agendamento: any, index: number) => (
                          <motion.div
                            key={agendamento.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Card className="border-white/5 bg-[#020305]/60 hover:bg-white/5 transition-all duration-300 rounded-3xl overflow-hidden group">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between gap-6">
                                  <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                      <User className="w-8 h-8" />
                                    </div>
                                    <div>
                                      <h3 className="text-xl font-bold text-white mb-1">
                                        {agendamento.clientes?.nome || 'Cliente Anônimo'}
                                      </h3>
                                      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500 font-medium">
                                        <span className="flex items-center gap-2">
                                          <Clock className="w-4 h-4 text-primary" />
                                          {agendamento.horario}
                                        </span>
                                        <span className="flex items-center gap-2">
                                          <Scissors className="w-4 h-4 text-zinc-700" />
                                          {agendamento.servicos?.nome || 'Serviço'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4">
                                    <Badge
                                      className={`
                                        rounded-full px-4 py-1 font-black uppercase tracking-widest text-[10px]
                                        ${agendamento.status === 'concluido' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400/20' :
                                          agendamento.status === 'em_andamento' ? 'bg-amber-500/10 text-amber-400 border-amber-400/20 animate-pulse' :
                                            'bg-white/5 text-zinc-500 border-white/10'}
                                      `}
                                    >
                                      {agendamento.status === 'concluido' ? 'Conferido' : agendamento.status.replace('_', ' ')}
                                    </Badge>

                                    {agendamento.status !== 'concluido' && (
                                      <Button
                                        size="sm"
                                        onClick={() => openConcluirDialog(agendamento)}
                                        className="h-12 px-6 rounded-2xl bg-white text-black hover:bg-primary hover:text-white transition-all font-black uppercase text-xs"
                                      >
                                        Finalizar
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[400px] text-center opacity-50 space-y-4">
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-zinc-800 flex items-center justify-center">
                          <Calendar className="w-8 h-8 text-zinc-800" />
                        </div>
                        <p className="text-zinc-600 font-bold uppercase tracking-widest text-sm">
                          Agenda Vazia para Hoje
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Queue Section - Right Side */}
          <motion.div variants={itemVariants}>
            <Card className="border-white/5 bg-zinc-900/20 backdrop-blur-3xl shadow-3xl h-full rounded-3xl overflow-hidden">
              <CardContent className="p-0">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-4">
                    <Users className="w-7 h-7 text-primary" />
                    Waitlist
                  </h2>
                  <Badge className="bg-primary text-black font-black">{fila?.length || 0}</Badge>
                </div>

                <div className="p-8">
                  {/* Atalho de Chamada Rápida */}
                  {fila && fila.filter((i: any) => i.status === 'aguardando').length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-8"
                    >
                      <Button
                        onClick={() => handleChamar(fila.find((i: any) => i.status === 'aguardando')?.id)}
                        className="w-full h-16 bg-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-gold hover:shadow-primary/40 hover:scale-[1.02] transition-all group"
                      >
                        <Volume2 className="w-5 h-5 mr-3 group-hover:animate-bounce" />
                        Chamar Próximo da Vez
                      </Button>
                    </motion.div>
                  )}

                  <ScrollArea className="h-[500px] pr-4">
                    {isFilaLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-20 w-full bg-white/5 rounded-2xl animate-pulse" />
                        ))}
                      </div>
                    ) : fila && fila.length > 0 ? (
                      <div className="space-y-4">
                        {fila.map((item: any, index: number) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Card className="border-white/5 bg-[#020305]/40 hover:border-primary/20 transition-all rounded-2xl">
                              <CardContent className="p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary text-black flex items-center justify-center font-black italic">
                                  {index + 1}
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-bold text-white text-sm tracking-tight">{item.clientes?.nome || 'Walk-in'}</h3>
                                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{item.servicos?.nome || 'Express'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {item.status === 'aguardando' && (
                                    <Button size="sm" variant="ghost" onClick={() => handleChamar(item.id)} className="h-10 px-4 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-black font-black uppercase text-[10px]">
                                      Chamar
                                    </Button>
                                  )}
                                  {item.status === 'chamado' && (
                                    <Button size="sm" variant="ghost" onClick={() => handleStatusUpdate(item.id, 'em_atendimento')} className="h-10 px-4 rounded-xl bg-white/10 text-white hover:bg-white hover:text-black font-black uppercase text-[10px]">
                                      Confirmar
                                    </Button>
                                  )}
                                  <Button size="icon" variant="ghost" onClick={() => openConcluirDialog(item)} className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white">
                                    <Check className="h-5 w-5" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[300px] opacity-30 text-center">
                        <Users className="w-12 h-12 mb-4" />
                        <p className="text-xs font-black uppercase tracking-[0.2em]">Sem Espera</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {/* Conclude Service Dialog - Premium Redesign */}
      <Dialog open={showConcluirDialog} onOpenChange={setShowConcluirDialog}>
        <DialogContent className="sm:max-w-md border-white/10 bg-[#020305] shadow-[0_32px_128px_rgba(0,0,0,0.8)] p-0 overflow-hidden rounded-[2rem]">
          <div className="p-8 bg-gradient-to-br from-primary/10 to-transparent border-b border-white/5">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-4">
                <CheckCircle2 className="w-8 h-8 text-primary" />
                Checkout
              </DialogTitle>
              <DialogDescription className="text-zinc-500 font-medium">
                Finalize o atendimento com perfeição.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Serviços Executados</Label>
              <div className="grid grid-cols-1 gap-3">
                {servicos?.map(s => {
                  const isSelected = selectedServicos.includes(s.id);
                  return (
                    <button key={s.id} onClick={() => {
                      const next = isSelected ? selectedServicos.filter(id => id !== s.id) : [...selectedServicos, s.id];
                      const nextPrice = servicos.filter(sv => next.includes(sv.id)).reduce((acc, curr) => acc + Number(curr.preco), 0);
                      setSelectedServicos(next);
                      setValorCobrado(nextPrice);
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

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Profissional</Label>
                <Select value={selectedFuncionario} onValueChange={setSelectedFuncionario}>
                  <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-xl px-4 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
                    {funcionarios?.filter(f => f.cargo === 'barbeiro' || f.cargo === 'gerente').map(f => (
                      <SelectItem key={f.id} value={f.id} className="focus:bg-primary focus:text-black font-bold">{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Pagamento</Label>
                <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                  <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-xl px-4 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
                    <SelectItem value="pix" className="focus:bg-primary focus:text-black font-bold">✨ PIX</SelectItem>
                    <SelectItem value="dinheiro" className="focus:bg-primary focus:text-black font-bold">💵 Dinheiro</SelectItem>
                    <SelectItem value="cartao_debito" className="focus:bg-primary focus:text-black font-bold">💳 Débito</SelectItem>
                    <SelectItem value="cartao_credito" className="focus:bg-primary focus:text-black font-bold">💳 Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Total a Receber</span>
              <span className="text-3xl font-black text-white italic">R$ {valorCobrado.toFixed(2)}</span>
            </div>
          </div>

          <DialogFooter className="p-8 pt-0 flex-col sm:flex-row gap-4">
            <Button
              variant="ghost"
              onClick={() => setShowConcluirDialog(false)}
              className="h-16 rounded-2xl font-black uppercase tracking-widest text-xs text-zinc-500 hover:text-white"
            >
              Voltar
            </Button>
            <Button
              onClick={handleConcluirAtendimento}
              disabled={!valorCobrado || !formaPagamento || isConcluding}
              className="h-16 flex-1 bg-white text-black hover:bg-primary hover:text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95 disabled:opacity-20"
            >
              {isConcluding ? (
                <div className="flex items-center gap-2">
                  <Activity className="animate-spin h-4 w-4" />
                  Concluindo...
                </div>
              ) : "Confirmar Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
