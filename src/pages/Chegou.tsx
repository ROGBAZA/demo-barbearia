import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useFilaPublica } from "@/hooks/useDatabase";
import { useCreateFilaPublicaComSenha } from "@/hooks/useFilaSenhas";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Clock, Scissors, User, Mail, Phone, Calendar, Users, ArrowLeft, Sparkles, Crown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import InputMask from 'react-input-mask';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenant } from "@/contexts/TenantContext";
import { motion } from "framer-motion";
import { Helmet } from 'react-helmet-async';

export default function Chegou() {
  const { tenant } = useTenant();
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    cpf: "",
    servico_descricao: "",
    barbeiro_id: "any",
    observacoes: "",
  });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const createFilaComSenha = useCreateFilaPublicaComSenha();
  const { data: fila } = useFilaPublica();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Namespace local storage by tenant to avoid cross-tenant leaks
  const storageIdKey = `fila_id_${tenant?.id}`;
  const storageNomeKey = `fila_nome_${tenant?.id}`;

  // Auto-redirect if user has an active queue session FOR THIS TENANT
  useEffect(() => {
    if (!tenant) return;
    const savedId = localStorage.getItem(storageIdKey);
    const savedNome = localStorage.getItem(storageNomeKey);

    if (savedId && savedNome) {
      console.log('Detectada sessão ativa da fila para este tenant, redirecionando...');
      const basePath = `/t/${tenant.slug}`;
      navigate(`${basePath}/posicao-fila?nome=${encodeURIComponent(savedNome)}`);
    }
  }, [tenant, navigate, storageIdKey, storageNomeKey]);

  const { data: servicos } = useQuery({
    queryKey: ['servicos-public', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      // Usando RPC para garantir acesso público consistente
      const { data, error } = await (supabase as any).rpc('get_public_servicos', { t_id: tenant.id });
      if (error) {
        console.error('Error fetching services:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!tenant?.id
  });



  const validatePhone = (phone: string) => {
    // Validação mais flexível: remove tudo que não é número e vê se tem 10 ou 11 dígitos
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  };

  const { data: barbeiros } = useQuery({
    queryKey: ['barbeiros-public', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      // Usando RPC para garantir acesso público via API controlada
      const { data, error } = await supabase.rpc('get_public_barbeiros', { t_id: tenant.id });
      if (error) {
        console.error('Error fetching professionals:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!tenant?.id
  });

  const toggleService = (serviceName: string) => {
    setSelectedServices(prev => {
      const isSelected = prev.includes(serviceName);
      if (isSelected) {
        return prev.filter(s => s !== serviceName);
      } else {
        return [...prev, serviceName];
      }
    });
  };

  useEffect(() => {
    setForm(prev => ({ ...prev, servico_descricao: selectedServices.join(' + ') }));
  }, [selectedServices]);

  const totalServicos = selectedServices.reduce((acc, name) => {
    const s = servicos?.find(serv => serv.nome === name);
    return acc + Number(s?.preco || 0);
  }, 0);

  const handleSubmit = async () => {
    if (!tenant?.id) return;
    if (!form.nome.trim()) {
      toast({ title: "Informe o nome", variant: "destructive" });
      return;
    }
    if (!validatePhone(form.telefone)) {
      toast({ title: "Telefone inválido", description: "Informe um telefone válido (10-11 dígitos)", variant: "destructive" });
      return;
    }

    setSubmitted(true);

    try {
      // 1. Check if user is already in the queue (locally filtered from public queue)
      const alreadyInQueue = fila?.some(entry =>
        (entry.telefone === form.telefone || (form.email && entry.email === form.email)) &&
        (entry.status === 'aguardando' || entry.status === 'chamado')
      );

      if (alreadyInQueue) {
        toast({
          title: "Você já está na fila!",
          description: "Aguarde sua vez ou cancele sua posição atual.",
          variant: "destructive"
        });
        setSubmitted(false);
        return;
      }

      // 2. Check for existing appointments (try/catch for RLS safety)
      let hasAppointment = false;
      try {
        const today = new Date().toISOString().split('T')[0];
        let queryStr = `telefone.eq.${form.telefone}`;
        if (form.email && form.email.trim()) {
          queryStr += `,email.eq.${form.email.toLowerCase().trim()}`;
        }

        const { data: existingAppointments, error: aptError } = await supabase
          .from('agendamentos')
          .select('id')
          .eq('tenant_id', tenant.id)
          .or(queryStr)
          .eq('status', 'agendado')
          .gte('data_hora', `${today}T00:00:00`)
          .lt('data_hora', `${today}T23:59:59`)
          .limit(1);

        if (!aptError && existingAppointments && existingAppointments.length > 0) {
          hasAppointment = true;
        }
      } catch (err) {
        console.warn("Skipping appointment check due to error (likely RLS):", err);
        // Continue flow if check fails
      }

      if (hasAppointment) {
        toast({
          title: "Você já tem um agendamento hoje!",
          description: "Verifique seus agendamentos ou fale com o barbeiro.",
          variant: "destructive"
        });
        setSubmitted(false);
        return;
      }



      const dataToSend = {
        nome: form.nome,
        telefone: form.telefone,
        servico_descricao: form.servico_descricao,
        observacoes: form.observacoes || null,
      };

      const result = await createFilaComSenha.mutateAsync(dataToSend);
      const newId = result?.fila_id;
      const senhaNúmero = result?.senha_numero;

      toast({
        title: `🎫 Senha ${String(senhaNúmero).padStart(3, '0')}`,
        description: "Sua posição está garantida! Acompanhe em tempo real.",
        duration: 5000
      });

      // Persist locally for session recovery
      localStorage.setItem(storageIdKey, newId || "active");
      localStorage.setItem(storageNomeKey, form.nome);
      localStorage.setItem(`senha_numero_${tenant?.id}`, String(senhaNúmero));

      const basePath = `/t/${tenant.slug}`;
      const queryParams = new URLSearchParams();
      if (newId) queryParams.set('id', newId);
      queryParams.set('nome', form.nome);
      queryParams.set('telefone', form.telefone);
      queryParams.set('senha', String(senhaNúmero));

      navigate(`${basePath}/posicao-fila?${queryParams.toString()}`);;
    } catch (error: any) {
      console.error(error);
      toast({ title: "Falha na Check-in", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setSubmitted(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#020305] text-white p-4 md:p-8 selection:bg-primary/30">
      <Helmet>
        <title>{tenant?.nome ? `Entrar na Fila - ${tenant.nome}` : 'Entrar na Fila | Central Barber'}</title>
        <meta name="description" content={`Entre na fila virtual da barbearia ${tenant?.nome || 'Central Barber'} de onde você estiver. Evite esperas e acompanhe sua posição em tempo real.`} />
        <meta name="keywords" content={`fila virtual, barbearia, ${tenant?.nome}, check-in online, agendar agora`} />
        <link rel="canonical" href={`${window.location.origin}${window.location.pathname}`} />
      </Helmet>

      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full opacity-40 animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-600/5 blur-[150px] rounded-full opacity-40" />
      </div>

      <div className="max-w-6xl mx-auto space-y-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-center justify-between gap-8"
        >
          <Button
            variant="ghost"
            onClick={() => {
              const slug = tenant?.slug || window.location.pathname.split('/')[1];
              navigate(`/${slug}`);
            }}
            className="text-zinc-500 hover:text-white uppercase text-[10px] font-black tracking-widest"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <div className="text-center md:text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">{tenant?.nome || 'ROUTE 66'}</p>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-white/40">
              <Users className="w-3.5 h-3.5" /> {fila?.length || 0} Clientes na Fila
            </div>
          </div>
        </motion.div>

        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">
            CHEGOU <span className="text-primary italic">SUA VEZ</span>
          </h1>
          <p className="text-zinc-500 text-lg font-medium max-w-2xl mx-auto">
            Registre-se abaixo para garantir seu lugar no templo. Atendimento por ordem de chegada com exclusividade absoluta.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-3xl rounded-[3rem] p-8 md:p-10 shadow-3xl">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-4">
                  <Crown className="w-6 h-6 text-primary" /> Entrada na Fila
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 space-y-8">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-black tracking-widest text-zinc-600 ml-1">Nome Completo</Label>
                    <Input
                      placeholder="Seu nome"
                      className="h-14 bg-white/[0.03] border-white/10 rounded-2xl px-6 focus:ring-primary focus:bg-white/[0.05]"
                      value={form.nome}
                      onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="uppercase text-[10px] font-black tracking-widest text-zinc-600 ml-1">Telefone / WhatsApp</Label>
                      <InputMask
                        mask="(99) 99999-9999"
                        value={form.telefone}
                        onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))}
                        maskChar={null}
                      >
                        {(inputProps: any) => (
                          <Input
                            {...inputProps}
                            placeholder="(00) 00000-0000"
                            className="h-14 bg-white/[0.03] border-white/10 rounded-2xl px-6"
                          />
                        )}
                      </InputMask>
                    </div>
                    <div className="space-y-2">
                      <Label className="uppercase text-[10px] font-black tracking-widest text-zinc-600 ml-1">Email (Opcional)</Label>
                      <Input
                        placeholder="seu@contato.com"
                        className="h-14 bg-white/[0.03] border-white/10 rounded-2xl px-6"
                        value={form.email}
                        onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <Separator className="bg-white/5" />

                <div className="space-y-6">
                  <Label className="uppercase text-[10px] font-black tracking-widest text-zinc-600 ml-1">Seleção de Serviços Elite</Label>
                  <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {servicos?.map((service: any) => (
                      <motion.div
                        key={service.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => toggleService(service.nome)}
                        className={`
                                        flex items-center justify-between p-5 rounded-2xl border cursor-pointer transition-all duration-300
                                        ${selectedServices.includes(service.nome)
                            ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]'
                            : 'bg-[#020305]/60 border-white/5 hover:border-white/20'
                          }
                                    `}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedServices.includes(service.nome) ? 'bg-primary text-black' : 'bg-white/5 text-zinc-600'}`}>
                            <Scissors className="w-5 h-5" />
                          </div>
                          <span className="font-bold text-white tracking-tight">{service.nome}</span>
                        </div>
                        <span className="font-black italic text-primary">R$ {Number(service.preco).toFixed(2)}</span>
                      </motion.div>
                    ))}
                  </div>
                  {selectedServices.length > 0 && (
                    <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/20 to-transparent border border-primary/20 flex justify-between items-center">
                      <span className="text-xs font-black uppercase text-primary/60 tracking-widest">Total Estimado</span>
                      <span className="text-3xl font-black italic text-primary tracking-tighter">R$ {totalServicos.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-black tracking-widest text-zinc-600 ml-1">Barbeiro de Escolha</Label>
                    <Select value={form.barbeiro_id} onValueChange={v => setForm(p => ({ ...p, barbeiro_id: v }))}>
                      <SelectTrigger className="h-14 bg-white/[0.03] border-white/10 rounded-2xl px-6 font-bold">
                        <SelectValue placeholder="Qualquer mestre disponível" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 rounded-2xl">
                        <SelectItem value="any" className="font-bold py-3 uppercase text-[10px] tracking-widest">Qualquer mestre disponível</SelectItem>
                        {barbeiros?.map((b: any) => (
                          <SelectItem key={b.id} value={b.id} className="font-bold py-3 uppercase text-[10px] tracking-widest">{b.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-black tracking-widest text-zinc-600 ml-1">Instruções Especiais</Label>
                    <Textarea
                      placeholder="Alguma preferência ou detalhe importante?"
                      className="min-h-[100px] bg-white/[0.03] border-white/10 rounded-2xl p-6 focus:ring-primary"
                      value={form.observacoes}
                      onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitted || selectedServices.length === 0}
                  className="w-full h-[72px] bg-white text-black hover:bg-primary hover:text-white font-black uppercase tracking-widest text-xs rounded-3xl shadow-xl transition-all active:scale-95 disabled:opacity-20"
                >
                  {submitted ? "ESTABELECENDO CONEXÃO..." : "ENTRAR NA FILA AGORA"}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-12"
          >
            {/* Queue Preview Card */}
            <Card className="bg-zinc-900/20 border-white/5 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-8 border-b border-white/5 flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" /> Fila em Tempo Real
                </CardTitle>
                <Badge className="bg-primary text-black font-black">{fila?.length || 0}</Badge>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-4">
                  {fila && fila.length > 0 ? (
                    fila.slice(0, 5).map((entry: any, idx: number) => (
                      <div key={entry.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center font-black text-[10px] italic">
                            {idx + 1}
                          </div>
                          <p className="font-bold text-sm text-zinc-300">{entry.nome}</p>
                        </div>
                        <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Aguardando</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 opacity-30">
                      <Clock className="w-12 h-12 mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Caminho Livre em Direção ao Topo</p>
                    </div>
                  )}
                  {fila && fila.length > 5 && (
                    <p className="text-center text-[9px] font-black uppercase text-zinc-600 tracking-widest">E mais {fila.length - 5} exclusivos na espera...</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Experience Card */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/20 to-amber-700/20 p-10 border border-primary/10 group">
              <Sparkles className="absolute top-[-20%] right-[-10%] w-32 h-32 text-primary/10 group-hover:rotate-12 transition-transform duration-1000" />
              <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-6">A EXPERIÊNCIA ATEMPORAL</h3>
              <div className="space-y-6">
                {[
                  { icon: Crown, t: "EXCLUSIVIDADE", d: "Sua entrada é processada por nossa arquitetura privada." },
                  { icon: Clock, t: "AGILIDADE", d: "Acompanhamento em tempo real via QueueSync™." },
                  { icon: Sparkles, t: "MAESTRIA", d: "Cada corte é um ritual de técnica e perfeição." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <item.icon className="w-6 h-6 text-primary shrink-0" />
                    <div>
                      <h4 className="font-black uppercase text-xs tracking-widest text-white mb-1">{item.t}</h4>
                      <p className="text-sm text-zinc-500 font-medium leading-tight">{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA App */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="relative overflow-hidden rounded-[2.5rem] bg-white text-black p-1 cursor-pointer"
              onClick={() => {
                const slug = tenant?.slug || window.location.pathname.split('/')[1];
                navigate(`/${slug}/agendar`);
              }}
            >
              <Card className="bg-white text-black rounded-[2.3rem] border-none p-10 shadow-gold group">
                <div className="flex justify-between items-center mb-6">
                  <p className="font-black uppercase tracking-[0.3em] text-[10px] opacity-60">CONVENIÊNCIA</p>
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-4">PREFERE AGENDAR?</h3>
                <p className="text-sm font-bold opacity-60 mb-8">Escolha sua data e mestre preferido com antecedência total.</p>
                <Button className="w-full h-16 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-zinc-900 shadow-xl transition-all">
                  ESTABELECER HORÁRIO AGORA <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
