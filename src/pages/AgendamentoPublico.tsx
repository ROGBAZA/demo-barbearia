import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import InputMask from 'react-input-mask';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock, User, Scissors, MapPin, Phone, CheckCircle, Sparkles, ArrowLeft } from 'lucide-react';
import { format, addDays, startOfDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { ServiceCards } from '@/components/ServiceCards';
import { ProfessionalCards } from '@/components/ProfessionalCards';
import { Servico, Barbeiro, Configuracao, ClienteData } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { useCreateAgendamentoPublico, useGetOrCreateClientPublic } from '@/hooks/useDatabase';

import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_LOGO, DEFAULT_BANNER } from '@/constants';
import barbershopHero from '@/assets/barbershop-hero.jpg';
import logoPng from '@/assets/logo.png';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';

export function AgendamentoPublico() {
  const { user, cliente, signUp, signIn } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const createAgendamento = useCreateAgendamentoPublico();
  const getOrCreateClient = useGetOrCreateClientPublic();
  const [selectedServico, setSelectedServico] = useState<string>('');
  const [selectedBarbeiro, setSelectedBarbeiro] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clienteData, setClienteData] = useState<ClienteData>({
    nome: '',
    telefone: '',
    email: ''
  });
  const [password, setPassword] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs para scroll automático
  const profSectionRef = React.useRef<HTMLDivElement>(null);
  const dateSectionRef = React.useRef<HTMLDivElement>(null);
  const dataSectionRef = React.useRef<HTMLDivElement>(null);
  const confirmSectionRef = React.useRef<HTMLDivElement>(null);

  // Efeito para preencher dados se já estiver logado
  useEffect(() => {
    if (user && cliente) {
      setClienteData(prev => ({
        nome: prev.nome || cliente.nome || '',
        telefone: prev.telefone || cliente.telefone || '',
        email: prev.email || cliente.email || ''
      }));
    } else if (user && !cliente) {
      // Fallback for user metadata
      setClienteData(prev => ({
        nome: prev.nome || user.user_metadata?.nome || '',
        telefone: prev.telefone || user.user_metadata?.telefone || '',
        email: prev.email || user.email || ''
      }));
    }
  }, [user, cliente]);

  // Efeitos de scroll automático
  useEffect(() => {
    if (selectedServico) {
      profSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedServico]);

  useEffect(() => {
    if (selectedBarbeiro) {
      dateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedBarbeiro]);

  useEffect(() => {
    if (selectedTime) {
      dataSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedTime]);

  // Fetch configurações
  const { data: config } = useQuery({
    queryKey: ['config-public', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data } = await (supabase as any).rpc('get_public_config', { t_id: tenant.id });
      // Converter para o formato Configuracao esperado
      if (data && data.length > 0) {
        return data[0] as Configuracao;
      }
      return null;
    },
    enabled: !!tenant?.id
  });

  // Fetch serviços usando RPC público filtrado por tenant
  const { data: servicos } = useQuery({
    queryKey: ['servicos-public', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data } = await (supabase as any).rpc('get_public_servicos', { t_id: tenant.id });
      return data as Servico[];
    },
    enabled: !!tenant?.id
  });

  // Fetch barbeiros usando RPC público filtrado por tenant
  const { data: barbeiros } = useQuery({
    queryKey: ['barbeiros-public', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data } = await (supabase as any).rpc('get_public_barbeiros', { t_id: tenant.id });
      return (data as unknown) as Barbeiro[];
    },
    enabled: !!tenant?.id
  });

  // Fetch horários ocupados
  const { data: horariosOcupados } = useQuery({
    queryKey: ['horarios-ocupados', selectedBarbeiro, selectedDate],
    queryFn: async () => {
      if (!selectedBarbeiro || !selectedDate) return [];

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data } = await (supabase as any).rpc('get_booked_slots', {
        funcionario_uuid: selectedBarbeiro,
        data_inicio: dateStr,
        data_fim: dateStr
      });
      return data || [];
    },
    enabled: !!(selectedBarbeiro && selectedDate)
  });

  // Gerar horários disponíveis
  // Gerar horários disponíveis com verificação de conflitos de duração
  const generateTimeSlots = () => {
    console.log('🕐 === GERANDO HORÁRIOS ===');
    console.log('Config:', config);
    console.log('Barbeiro selecionado:', selectedBarbeiro);
    console.log('Data selecionada:', selectedDate);

    if (!config || !selectedBarbeiro || !selectedDate) return [];

    const barbeiro = barbeiros?.find(b => b.id === selectedBarbeiro);
    console.log('Barbeiro encontrado:', barbeiro);
    if (!barbeiro) return [];

    // Duracao do servico selecionado (padrao 30 min se nao encontrado)
    const serviceDuration = selectedServicoObj?.duracao_minutos || 30;
    console.log('🕐 Duração do serviço:', serviceDuration, 'minutos');

    const dayOfWeek = selectedDate.getDay();
    const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek; // Domingo = 7
    console.log('📅 Dia da semana:', dayOfWeek, '→', dayNumber);

    // Verificar se é dia de trabalho do barbeiro (Fallback para horário da barbearia se vazio)
    const diasTrabalhoBarbeiro = barbeiro.dias_trabalho && barbeiro.dias_trabalho.length > 0
      ? barbeiro.dias_trabalho
      : config.dias_funcionamento;

    const normalizedDiasTrabalho = (diasTrabalhoBarbeiro || []).map(d => d === 0 ? 7 : d);
    console.log('👨‍💼 Dias de trabalho considerados:', normalizedDiasTrabalho);

    if (!normalizedDiasTrabalho.includes(dayNumber)) {
      console.log('❌ Barbeiro não trabalha neste dia!');
      return [];
    }

    // Verificar se é dia de funcionamento da barbearia
    const normalizedDiasFuncionamento = config.dias_funcionamento.map(d => d === 0 ? 7 : d);
    console.log('🏪 Dias de funcionamento da barbearia:', normalizedDiasFuncionamento);
    if (!normalizedDiasFuncionamento.includes(dayNumber)) {
      console.log('❌ Barbearia fechada neste dia!');
      return [];
    }

    // Fallback: Se o barbeiro não tem horário definido, usa o da barbearia
    const startTime = barbeiro.horario_inicio || config.horario_abertura || '09:00';
    const endTime = barbeiro.horario_fim || config.horario_fechamento || '18:00';

    console.log('⏰ Horário considerado:', startTime, '→', endTime);


    const slots: string[] = [];

    // Using simple minutes calculation to avoid Date timezone issues
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    console.log('🔢 Minutos:', currentMinutes, '→', endMinutes);

    // Converter agendamentos existentes
    const existingIntervals = (horariosOcupados as any[] || []).map((slot: any) => {
      const slotDate = new Date(slot.data_hora);
      // Use getHours/getMinutes for local comparison since generateTimeSlots uses local context
      const startMinutes = slotDate.getHours() * 60 + slotDate.getMinutes();
      const duration = slot.duracao_minutos || 30;
      return { start: startMinutes, end: startMinutes + duration };
    });
    console.log('📋 Horários já ocupados:', existingIntervals);

    while (currentMinutes + serviceDuration <= endMinutes) {
      const slotStart = currentMinutes;
      const slotEnd = currentMinutes + serviceDuration;

      // Overlap check
      const isOverlapping = existingIntervals.some(interval => {
        return slotStart < interval.end && slotEnd > interval.start;
      });

      // Past check (if today)
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const isPast = isToday(selectedDate) && slotStart <= nowMinutes;

      if (!isOverlapping && !isPast) {
        const h = Math.floor(slotStart / 60).toString().padStart(2, '0');
        const m = (slotStart % 60).toString().padStart(2, '0');
        slots.push(`${h}:${m}`);
      }

      currentMinutes += 30; // Grid increment
    }

    console.log('✅ SLOTS FINAIS:', slots);
    console.log('📊 Total de slots gerados:', slots.length);
    return slots;
  };

  const validatePhone = (phone: string) => {
    // Validação mais flexível: remove tudo que não é número e vê se tem 10 ou 11 dígitos
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedServico) {
      toast({ title: "Selecione o serviço", description: "Escolha um serviço para continuar.", variant: "destructive" });
      return;
    }
    if (!selectedBarbeiro) {
      toast({ title: "Selecione o profissional", description: "Escolha quem irá te atender.", variant: "destructive" });
      return;
    }
    if (!selectedDate || !selectedTime) {
      toast({ title: "Escolha data e hora", description: "Selecione quando você quer vir.", variant: "destructive" });
      return;
    }
    if (!clienteData.nome || !clienteData.telefone) {
      toast({ title: "Dados de contato", description: "Por favor, informe seu nome e telefone.", variant: "destructive" });
      return;
    }

    // Validação de telefone
    if (!clienteData.telefone || !validatePhone(clienteData.telefone)) {
      toast({
        title: "Telefone inválido",
        description: "Por favor, informe um telefone válido no formato (XX) XXXXX-XXXX",
        variant: "destructive"
      });
      return;
    }

    // Impede múltiplos envios
    if (isSubmitting || submitted) return;

    setSubmitted(true);
    setIsSubmitting(true);

    try {
      const dataHora = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      dataHora.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Se quiser criar conta
      if (!user && createAccount && clienteData.email && password) {
        const { error: signUpError } = await signUp(clienteData.email, password, {
          nome: clienteData.nome,
          cargo: 'cliente',
          telefone: clienteData.telefone,
          tenantId: tenant?.id
        });

        if (signUpError) {
          throw new Error(`Erro ao criar conta: ${signUpError.message}`);
        }

        // Tenta fazer login automático
        await signIn(clienteData.email, password);
      }

      // Identificar o ID do usuário (Usa o do hook useAuth primeiro)
      const currentUserId = user?.id;
      console.log('👤 Usuário detectado no Agendamento:', currentUserId);

      // Obter ou criar cliente via RPC (SECURITY DEFINER)
      const clientId = await getOrCreateClient.mutateAsync({
        nome: clienteData.nome,
        telefone: clienteData.telefone,
        email: clienteData.email,
        user_id: currentUserId || undefined
      });

      if (!clientId) throw new Error('Erro ao processar identificação do cliente.');
      if (!tenant?.id) throw new Error('Tenant não resolvido.');

      // Criar agendamento via RPC (SECURITY DEFINER)
      await createAgendamento.mutateAsync({
        cliente_id: clientId,
        servico_id: selectedServico,
        funcionario_id: selectedBarbeiro,
        data_hora: dataHora.toISOString(),
        observacoes: observacoes || undefined
      });

      toast({
        title: "🎉 Agendamento realizado com sucesso!",
        description: "Obrigado por escolher nossa barbearia! Redirecionando...",
        duration: 3000,
      });

      setIsSubmitting(false);
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);

      setIsSubmitting(false);
    } catch (error: any) {
      console.error('❌ ERRO NO AGENDAMENTO:', error);
      toast({
        title: "Erro ao Finalizar",
        description: error.message || "Verifique sua conexão e tente novamente.",
        variant: "destructive"
      });
      setIsSubmitting(false);
      setSubmitted(false);
    }
  };

  const selectedServicoObj = servicos?.find(s => s.id === selectedServico);
  const timeSlots = generateTimeSlots();

  if (submitted && !isSubmitting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl border-primary/20 bg-card/50 backdrop-blur animate-in zoom-in duration-300">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20">
              <CheckCircle className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold text-primary">Agendado!</CardTitle>
            <CardDescription className="text-lg">
              Tudo certo! Redirecionando você agora...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="p-4 rounded-lg bg-muted/50 border border-primary/10">
              <p className="font-semibold text-lg">{selectedServicoObj?.nome}</p>
              <p className="text-muted-foreground">
                {selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às {selectedTime}
              </p>
            </div>
            <div className="mt-8 flex justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Helmet>
        <title>{tenant?.nome ? `${tenant.nome} | Agendamento Online` : 'Agendamento Online | Central Barber'}</title>
        <meta name="description" content={`Agende seu horário na barbearia ${tenant?.nome || 'Central Barber'}. Escolha o serviço, o profissional e o melhor horário para você de forma rápida e prática.`} />
        <meta name="keywords" content={`agendamento, barbearia, ${tenant?.nome}, corte de cabelo, barba, agendar online`} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${tenant?.nome || 'Central Barber'} | Agendamento Online`} />
        <meta property="og:description" content={`Agende seu horário na barbearia ${tenant?.nome || 'Central Barber'}. Estilo e precisão ao seu alcance.`} />
        <meta property="og:image" content={config?.logo_url || DEFAULT_LOGO} />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={`${tenant?.nome || 'Central Barber'} | Agendamento Online`} />
        <meta property="twitter:description" content={`Agende seu horário na barbearia ${tenant?.nome || 'Central Barber'}.`} />
        <meta property="twitter:image" content={config?.logo_url || DEFAULT_LOGO} />
      </Helmet>
      <div className="container mx-auto px-4 pt-6 relative z-50">
        <Button
          variant="default"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all duration-200 hover:scale-105"
          size="lg"
        >
          <ArrowLeft className="h-5 w-5" />
          Voltar para Início
        </Button>
      </div>

      <div className="h-64 relative overflow-hidden bg-primary/20">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[10s] hover:scale-105"
          style={{
            backgroundImage: `url(${(!config?.banner_url || config.banner_url.includes('googleusercontent')) ? DEFAULT_BANNER : config.banner_url})`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-primary/10 to-transparent" />
      </div>

      <div className="container mx-auto px-4 py-8 relative -mt-16 md:-mt-32 z-10">
        <div className="flex flex-col items-center gap-6 mb-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative group cursor-pointer"
          >
            <div className="absolute -inset-4 bg-primary/20 rounded-[2.5rem] blur-2xl group-hover:bg-primary/30 transition-all duration-500" />
            <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-[2rem] bg-gradient-to-br from-primary via-primary-glow to-amber-700 p-[2px] shadow-gold">
              <div className="w-full h-full rounded-[1.9rem] bg-[#090b10] flex items-center justify-center overflow-hidden">
                <img
                  src={config?.logo_url || logoPng || DEFAULT_LOGO}
                  alt={`Logo da barbearia ${tenant?.nome || 'Central Barber'}`}
                  className="w-full h-full object-contain p-2"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== DEFAULT_LOGO) {
                      target.src = DEFAULT_LOGO;
                    }
                  }}
                />
              </div>
            </div>
          </motion.div>

          <div className="w-full max-w-[90vw] mx-auto overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-3xl md:text-6xl font-black text-white drop-shadow-2xl tracking-tighter px-2 uppercase break-words leading-none">
              {config?.nome_barbearia?.split(' ')[0] || 'Central'} <span className="text-primary italic">{config?.nome_barbearia?.split(' ').slice(1).join(' ') || 'Barber'}</span>
            </h1>
            <div className="h-1 w-24 bg-primary mx-auto mt-4 rounded-full shadow-gold" />
            <p className="text-white/80 font-bold text-xs md:text-xl mt-4 drop-shadow-md px-6 tracking-widest uppercase opacity-60">A EXPERIÊNCIA DEFINITIVA EM ESTÉTICA MASCULINA</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm">
          {config?.endereco && (
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white shadow-lg">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-medium">{config.endereco}</span>
            </div>
          )}
          {config?.telefone && (
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white shadow-lg">
              <Phone className="h-4 w-4 text-primary" />
              <span className="font-medium">{config.telefone}</span>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              className="relative group cursor-pointer"
              onClick={() => {
                const slug = tenant?.slug || window.location.pathname.split('/')[1];
                navigate(`/${slug}/chegou`);
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative h-40 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-[3rem] p-8 text-center hover:border-primary/50 transition-all shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Entrar na Fila</h3>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Atendimento Agora</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              className="relative group cursor-pointer"
              onClick={() => {
                const slug = tenant?.slug || window.location.pathname.split('/')[1];
                navigate(`/${slug}/agendar`);
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative h-40 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-[3rem] p-8 text-center hover:border-primary/50 transition-all shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <CalendarIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Agendar Horário</h3>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Para outro dia</p>
              </div>
            </motion.div>
          </div>

          <form onSubmit={handleSubmit}>
            <Card className="shadow-xl border-0 bg-card/60 backdrop-blur-xl relative overflow-hidden">
              {/* Background Decoration */}
              <div
                className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: `url(${config?.banner_url || barbershopHero})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />

              <div className="relative z-10">
                <CardHeader className="bg-gradient-to-r from-primary/20 to-transparent border-b border-primary/10">
                  <CardTitle className="flex items-center justify-center gap-3 text-2xl">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Scissors className="h-6 w-6 text-primary" />
                    </div>
                    Novo Agendamento
                  </CardTitle>
                  <CardDescription className="text-center text-base">
                    Preencha os dados abaixo para agendar seu horário com estilo
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-8 p-6">
                  <div className="space-y-4">
                    <Label className="text-lg font-bold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      1. Escolha o Serviço *
                    </Label>
                    <ServiceCards
                      servicos={servicos || []}
                      selectedServico={selectedServico}
                      onSelectServico={setSelectedServico}
                    />
                  </div>

                  <div className="space-y-4 pt-6 border-t border-primary/5" ref={profSectionRef}>
                    <Label className="text-lg font-bold flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      2. Escolha o Profissional *
                    </Label>
                    <ProfessionalCards
                      barbeiros={barbeiros || []}
                      selectedBarbeiro={selectedBarbeiro}
                      onSelectBarbeiro={setSelectedBarbeiro}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-8 pt-6 border-t border-primary/5" ref={dateSectionRef}>
                    <div className="space-y-4">
                      <Label className="text-lg font-bold flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-primary" />
                        3. Escolha a Data *
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "h-14 justify-start text-left font-normal w-full border-2 hover:border-primary/50 transition-all",
                              !selectedDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-3 h-5 w-5 text-primary" />
                            {selectedDate ? (
                              format(selectedDate, "PPP", { locale: ptBR })
                            ) : (
                              "Clique para escolher uma data"
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 shadow-2xl border-primary/20">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            initialFocus
                            disabled={(date) => date < startOfDay(new Date())}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-lg font-bold flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        4. Escolha o Horário *
                      </Label>
                      {selectedDate && selectedBarbeiro ? (
                        <div className="grid grid-cols-3 gap-2">
                          {timeSlots.map(time => (
                            <Button
                              key={time}
                              type="button"
                              variant={selectedTime === time ? "default" : "outline"}
                              className={cn(
                                "h-12 text-base font-semibold transition-all border-2",
                                selectedTime === time ? "shadow-md scale-105" : "hover:border-primary/30"
                              )}
                              onClick={() => setSelectedTime(time)}
                            >
                              {time}
                            </Button>
                          ))}
                          {timeSlots.length === 0 && (
                            <div className="col-span-3 p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
                              Nenhum horário disponível para esta data
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-14 flex items-center justify-center bg-muted/30 rounded-lg text-sm text-muted-foreground border-2 border-dashed">
                          Selecione profissional e data primeiro
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6 pt-8 border-t border-primary/5" ref={dataSectionRef}>
                    <h3 className="text-xl font-bold flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      5. Seus Dados de Contato
                    </h3>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome Completo *</Label>
                        <Input
                          id="nome"
                          value={clienteData.nome}
                          onChange={(e) => setClienteData(prev => ({ ...prev, nome: e.target.value }))}
                          placeholder="Como podemos te chamar?"
                          className="h-12 text-base border-2 focus:border-primary"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="telefone">Telefone (WhatsApp) *</Label>
                        <InputMask
                          mask="(99) 99999-9999"
                          value={clienteData.telefone}
                          onChange={(e) => setClienteData(prev => ({ ...prev, telefone: e.target.value }))}
                          disabled={false}
                          maskChar={null}
                        >
                          {(inputProps: any) => (
                            <Input
                              {...inputProps}
                              id="telefone"
                              placeholder="(00) 00000-0000"
                              className="h-12 text-base border-2 focus:border-primary"
                              required
                            />
                          )}
                        </InputMask>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={clienteData.email}
                        onChange={(e) => setClienteData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="seu@exemplo.com"
                        className="h-12 text-base border-2 focus:border-primary"
                        required
                      />
                    </div>

                    {!user && (
                      <div className="p-6 rounded-xl bg-primary/5 border-2 border-primary/10 space-y-4">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="create-account"
                            checked={createAccount}
                            onChange={(e) => setCreateAccount(e.target.checked)}
                            className="w-5 h-5 rounded border-primary text-primary focus:ring-primary"
                          />
                          <Label htmlFor="create-account" className="font-bold text-base cursor-pointer">
                            Desejo criar uma conta para gerenciar meus agendamentos
                          </Label>
                        </div>

                        {createAccount && (
                          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                            <Label htmlFor="password">Crie uma senha segura (mín. 6 caracteres)</Label>
                            <Input
                              id="password"
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••"
                              className="h-12 bg-background border-2"
                              minLength={6}
                              required={createAccount}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="observacoes">Observações (Opcional)</Label>
                      <Textarea
                        id="observacoes"
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        placeholder="Deseja deixar algum recado para o profissional?"
                        className="resize-none border-2 focus:border-primary"
                        rows={3}
                      />
                    </div>
                  </div>

                  {selectedServicoObj && selectedDate && selectedTime && (
                    <Card className="bg-primary/5 border-2 border-primary/20 shadow-inner overflow-hidden" ref={confirmSectionRef}>
                      <div className="bg-primary/10 px-4 py-2 border-b border-primary/10">
                        <p className="text-xs font-bold text-primary uppercase tracking-widest">Resumo Final</p>
                      </div>
                      <CardContent className="p-6 space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="flex items-start gap-3">
                            <Scissors className="h-5 w-5 text-primary shrink-0 mt-1" />
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground">Serviço</p>
                              <p className="font-bold">{selectedServicoObj.nome}</p>
                              <p className="text-sm font-semibold text-primary">R$ {Number(selectedServicoObj.preco).toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <CalendarIcon className="h-5 w-5 text-primary shrink-0 mt-1" />
                            <div>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground">Quando</p>
                              <p className="font-bold">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</p>
                              <p className="text-sm font-semibold text-primary">às {selectedTime}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>

                <CardFooter className="p-6 bg-muted/30 border-t">
                  <Button
                    type="submit"
                    className="w-full h-16 text-xl font-bold shadow-gold hover:scale-[1.01] transition-all"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processando...
                      </div>
                    ) : "Confirmar e Agendar Agora"}
                  </Button>
                </CardFooter>
              </div>
            </Card>
          </form>
        </div>
      </div>
    </div >
  );
}
