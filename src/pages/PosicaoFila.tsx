import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, ArrowLeft, Bell, BellOff, Volume2, ShieldAlert, Sparkles, Crown, Scissors, Trash2, AlertTriangle } from "lucide-react";
import { useFilaPublica } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/TenantContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const CALL_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3";

// Função para calcular tempo estimado baseado em serviço
const calcularTempoEstimado = (posicao: number, servicoDescricao?: string | null): number => {
  // Tempo base dependendo do tipo de serviço
  let tempoMedio = 20; // minutos padrão

  if (servicoDescricao) {
    const servico = servicoDescricao.toLowerCase();
    if (servico.includes('barba')) tempoMedio = 15;
    else if (servico.includes('corte')) tempoMedio = 25;
    else if (servico.includes('completo') || servico.includes('combo')) tempoMedio = 40;
    else if (servico.includes('sobrancelha')) tempoMedio = 10;
  }

  return posicao * tempoMedio;
};

export default function PosicaoFila() {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const { data: fila, isLoading, refetch } = useFilaPublica();
  const [searchName, setSearchName] = useState("");
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [cancelando, setCancelando] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNotifiedId = useRef<string | null>(null);

  const storageIdKey = `fila_id_${tenant?.id}`;
  const storageNomeKey = `fila_nome_${tenant?.id}`;

  const filaAguardando = fila?.filter(e => e.status === 'aguardando' || e.status === 'chamado') || [];

  const [searchId, setSearchId] = useState<string | null>(null);

  const minhaPosicao = filaAguardando.findIndex(entry => {
    if (searchId) {
      return entry.id === searchId;
    }
    return searchName && (
      entry.nome.toLowerCase().includes(searchName.toLowerCase()) ||
      (entry.telefone && entry.telefone.replace(/\D/g, '').includes(searchName.replace(/\D/g, '')))
    );
  });

  useEffect(() => {
    if (!tenant) return;
    const params = new URLSearchParams(window.location.search);
    const nome = params.get('nome');
    const telefone = params.get('telefone');
    const id = params.get('id');

    if (id) {
      setSearchId(id);
    } else {
      const savedId = localStorage.getItem(storageIdKey);
      if (savedId && savedId !== 'active') {
        setSearchId(savedId);
      }
    }

    if (nome || telefone) {
      setSearchName(nome || telefone || '');
      if (nome) localStorage.setItem(storageNomeKey, nome);
    } else {
      const savedNome = localStorage.getItem(storageNomeKey);
      if (savedNome) {
        setSearchName(savedNome);
      }
    }
  }, [tenant, storageNomeKey]);

  // Cálculos de posição movidos para o topo para evitar ReferenceError
  const meuEntry = minhaPosicao !== -1 ? filaAguardando[minhaPosicao] : null;
  const meuId = meuEntry?.id;
  const tempoEstimado = meuEntry ? calcularTempoEstimado(minhaPosicao, meuEntry.servico_descricao) : 0;

  const VAPID_PUBLIC_KEY = "BE7DoYNMx2nHqJqb2MbpUTCdwjuUHMgudomZdA7C15XKNbakZjB5neFrc8c26uvm0K6b0Yee0SV6IQKc7zIy9q4";

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async (registration: ServiceWorkerRegistration) => {
    try {
      console.log("📡 Solicitando assinatura de Push...");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      console.log("✅ Assinado com sucesso:", subscription);

      // Tentar pegar o ID de qualquer lugar para não falhar a ativação
      const urlParams = new URL(window.location.href).searchParams;
      const effectiveId = meuId || searchId || urlParams.get('id') || localStorage.getItem(storageIdKey);

      if (effectiveId) {
        console.log("💾 Salvando assinatura para ID:", effectiveId);
        const { error } = await supabase
          .from('fila_espera')
          .update({ push_subscription: JSON.parse(JSON.stringify(subscription)) })
          .eq('id', effectiveId);

        if (error) {
          console.error("Erro saving push_subscription:", error);
          toast({ title: "Erro na ativação", description: "Não conseguimos salvar seu alerta no servidor.", variant: "destructive" });
        } else {
          toast({ title: "🚀 ALERTA CONFIGURADO", description: "Você será avisado com prioridade total!", className: "bg-emerald-500 text-white border-none" });
        }
      } else {
        console.error("❌ Erro: Nenhum ID de cliente encontrado");
        toast({ title: "Ops!", description: "Não localizamos sua posição na fila para ativar o alerta.", variant: "destructive" });
      }
    } catch (err) {
      console.error('Erro no Push subscribe:', err);
      toast({ title: "Falha técnica", description: "Seu navegador bloqueou o registro do alerta.", variant: "destructive" });
    }
  };

  const handleActivation = async () => {
    // 1. ESCONDER OVERLAY IMEDIATAMENTE (Prioridade UI/UX)
    setIsAudioInitialized(true);
    console.log("🚀 INICIANDO ATIVAÇÃO DE ALERTAS");

    // 2. Inicialização do Audio (Direct User Gesture)
    if (!audioRef.current) {
      audioRef.current = new Audio(CALL_SOUND_URL);
    }

    try {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        await playPromise;
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      console.log("✅ Audio pronto para chamadas");
    } catch (e) {
      console.warn("⚠️ Audio autoplay bloqueado ou falhou:", e);
    }

    try {
      // 3. Permissão de Notificação (Se disponível)
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          setNotificationPermission(permission);
          console.log("✅ Permissão de notificação:", permission);
        }
      }

      // 4. Service Worker & Push (Processamento em Background)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        console.log("✅ Service Worker e Push configurados");

        if (Notification.permission === 'granted') {
          await subscribeToPush(registration);
          await registration.showNotification("⚠️ ALERTAS ATIVOS", {
            body: "Você será avisado quando chegar sua vez!",
            icon: "/favicon.ico",
            tag: "welcome",
            vibrate: [500, 200, 500]
          });
        }
      }
    } catch (err) {
      console.error("Erro na ativação avançada:", err);
      // Não re-exibimos o banner, pois o áudio básico já foi tentado
    }

    // 5. Wake Lock & Silent Loop
    requestWakeLock();
    startSilentLoop();

    toast({
      title: "🔔 Alertas Ativados!",
      description: "Você será notificado quando sua vez chegar.",
      className: "bg-primary text-black font-bold"
    });
  };


  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        // @ts-ignore
        const wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
          if (document.visibilityState === 'visible') requestWakeLock();
        });
      } catch (err) {
        console.error('Wake Lock error:', err);
      }
    }
  };

  const handleCancelarPosicao = async () => {
    if (!meuId || !tenant?.id) return;
    setCancelando(true);
    try {
      const { error } = await supabase
        .from('fila_espera')
        .update({ status: 'cancelado' })
        .eq('id', meuId)
        .eq('tenant_id', tenant.id);

      if (error) throw error;

      toast({ title: "Saiu da fila", description: "Sua posição foi cancelada." });
      setSearchId(null);
      localStorage.removeItem(storageIdKey);
      setCancelando(false);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro", description: "Não foi possível cancelar.", variant: "destructive" });
      setCancelando(false);
    }
  };

  // Técnica "Silence Keep-Alive" para manter o processo ativo em background (Padrão Spotify/YouTube)
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  const startSilentLoop = async () => {
    if (!silentAudioRef.current) {
      // Clip de silêncio mais longo (10 segundos) para ser mais "real" para o SO
      const silentSrc = "data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA== ";
      silentAudioRef.current = new Audio(silentSrc);
      silentAudioRef.current.loop = true;
      silentAudioRef.current.volume = 0.01;
    }

    try {
      await silentAudioRef.current.play();
      console.log("🔊 MODO PERFORMANCE ATIVO (MANTENDO APP VIVO)");

      // Integrar com MediaSession para aparecer no LockScreen e evitar suspensão
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: '⚠️ Sua vez está chegando! ⚠️',
          artist: 'Barbearia Premium',
          album: 'Acompanhando Fila VIP',
          artwork: [{ src: '/favicon.ico', sizes: '512x512', type: 'image/png' }]
        });

        const actionHandler = () => { /* mantém vivo */ };
        navigator.mediaSession.setActionHandler('play', actionHandler);
        navigator.mediaSession.setActionHandler('pause', actionHandler);
      }
    } catch (err) {
      console.log("Silent loop pending interaction");
    }
  };

  useEffect(() => {
    if (isAudioInitialized) {
      startSilentLoop();
      document.addEventListener('click', startSilentLoop, { once: true });
    }
    return () => {
      silentAudioRef.current?.pause();
      silentAudioRef.current = null;
    };
  }, [isAudioInitialized]);

  // Re-ativar recursos quando a página volta a ficar visível
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
        if (isAudioInitialized && audioRef.current) {
          audioRef.current.load();
        }
        if (silentAudioRef.current && silentAudioRef.current.paused) {
          silentAudioRef.current.play().catch(() => { });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAudioInitialized]);

  // Listener para mensagens do Service Worker (Ponte para soar o alarme em background)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'FIRE_ALARM') {
          console.log("🚨 RECEBIDO COMANDO DE ALARME VIA SW!");
          playNotification();
        }
      };
      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
    }
  }, [isAudioInitialized, notificationPermission]);

  const playNotification = () => {
    console.log("🔔 DISPARANDO ALERTA DE ALTA PRIORIDADE 🔔");

    // 1. Tocar som de chamada principal (Tentativa em background)
    if (audioRef.current && isAudioInitialized) {
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 1.0;
      audioRef.current.play().catch(e => console.error("Erro ao tocar áudio:", e));
    }

    // 2. Vibrar Dispositivo (Mesmo que falhe em background, o SW tentará)
    if (navigator.vibrate) {
      navigator.vibrate([1000, 200, 1000, 200, 1000, 200, 1000, 200, 1000]);
    }

    // 3. Notificação via Service Worker (Obrigatório para tela bloqueada)
    if ('serviceWorker' in navigator && (notificationPermission === 'granted' || Notification.permission === 'granted')) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification("⚠️ SUA VEZ CHEGOU! ⚠️", {
          body: "O BARBEIRO ESTÁ PRONTO! Dirija-se ao local IMEDIATAMENTE.",
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          requireInteraction: true,
          tag: 'emergency-barber-call',
          renotify: true,
          vibrate: [1000, 200, 1000, 200, 1000, 200, 1000, 200, 1000],
          timestamp: Date.now(),
          data: { url: window.location.href }
        });
      });
    }
  };

  useEffect(() => {
    if (minhaPosicao !== -1) {
      const meuEntry = filaAguardando[minhaPosicao];
      const notificationId = `${meuEntry.id}-${meuEntry.updated_at}`;

      if (meuEntry.status === 'chamado' && lastNotifiedId.current !== notificationId) {
        playNotification();
        lastNotifiedId.current = notificationId;

        // Toast visual in-app
        toast({
          title: "🚀 CHEGOU SUA VEZ!",
          description: "Dirija-se ao seu mestre agora.",
          duration: 30000, // 30s
          className: "bg-primary text-black border-none"
        });
      }
    }
  }, [filaAguardando, minhaPosicao, isAudioInitialized]);


  useEffect(() => {
    if (!tenant?.id) return;

    // Real-time listener scoped to tenant
    const channel = supabase
      .channel(`fila_posicao_${tenant.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fila_espera',
          filter: `tenant_id=eq.${tenant.id}`
        },
        (payload: any) => {
          // Notification handled by useEffect state change
          refetch();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fila_espera', filter: `tenant_id=eq.${tenant.id}` },
        () => refetch()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenant, refetch, meuId, isAudioInitialized]);

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  if ((!fila && isLoading) || (minhaPosicao === -1 && searchName && isLoading)) {
    return (
      <div className="min-h-screen bg-[#020305] text-white flex items-center justify-center p-8">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-primary font-black uppercase tracking-[0.4em] text-xs animate-pulse italic">QueueSync™ Sincronizando...</p>
        </div>
      </div>
    );
  }

  if (minhaPosicao === -1 && !isLoading) {
    return (
      <div className="min-h-screen bg-[#020305] flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-zinc-900/40 border-white/5 backdrop-blur-3xl rounded-[3rem] p-8 md:p-12 text-center shadow-3xl">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
            <Users className="h-20 w-20 mx-auto relative text-primary" />
          </div>
          <h2 className="text-3xl font-black mb-4 uppercase italic tracking-tighter">Localize sua Posição</h2>
          <p className="text-zinc-500 font-medium mb-8">Digite seu nome ou telefone para recuperar seu lugar na fila.</p>

          <div className="space-y-4 mb-8">
            <div className="relative group">
              <Users className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Nome ou Telefone"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full h-16 pl-14 pr-6 bg-black/40 border border-white/10 rounded-2xl text-white outline-none focus:border-primary/50 transition-all font-bold"
              />
            </div>

            <Button
              onClick={() => refetch()}
              className="h-16 w-full bg-primary text-black font-black uppercase rounded-2xl shadow-gold hover:shadow-primary/40 transition-all"
            >
              BUSCAR AGORA
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={() => {
              const slug = tenant?.slug || window.location.pathname.split('/')[1];
              navigate(`/${slug}`);
            }}
            className="w-full text-zinc-500 font-bold uppercase text-[10px] tracking-widest"
          >
            Voltar ao Menu
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#020305] text-white p-4 md:p-8 selection:bg-primary/30">

      {/* Cinematic Background Glows */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-primary/10 blur-[200px] rounded-full opacity-40 animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[70%] h-[70%] bg-amber-600/5 blur-[200px] rounded-full opacity-40" />
      </div>

      <AnimatePresence>
        {!isAudioInitialized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/98 backdrop-blur-3xl p-6"
          >
            <Card className="max-w-xs w-full bg-zinc-900 border-primary/20 text-center space-y-8 p-10 rounded-[3rem] shadow-heavy ring-1 ring-white/10">
              <div className="w-24 h-24 bg-gradient-to-br from-primary to-amber-600 rounded-full flex items-center justify-center mx-auto shadow-gold animate-pulse">
                <Bell className="h-12 w-12 text-black" />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">ALERTA DE CHAMADA</h2>
                <p className="text-[10px] text-white/50 font-black uppercase tracking-[0.2em] leading-relaxed">
                  AUTORIZE AS NOTIFICAÇÕES PARA ACENDER A TELA E VIBRAR QUANDO CHEGAR SUA VEZ.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  console.log("🖱️ Clique detectado botão alertas");
                  handleActivation();
                }}
                className="w-full h-20 bg-primary text-black font-black uppercase text-sm rounded-2xl shadow-gold hover:scale-105 transition-all relative z-[250]"
              >
                ATIVAR ALERTAS AGORA
              </Button>
              <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest italic">Toque acima para ativar</p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto space-y-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <Button
            variant="ghost"
            onClick={() => {
              const slug = tenant?.slug || window.location.pathname.split('/')[1];
              navigate(`/${slug}`);
            }}
            className="text-zinc-500 hover:text-white uppercase text-[10px] font-black tracking-widest"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Portaria
          </Button>
          <div className="flex items-center gap-3">
            <Badge className={`${isAudioInitialized ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary/10 text-primary animate-pulse'} border-none font-black text-[9px] py-1 px-4 tracking-widest rounded-full uppercase`}>
              {isAudioInitialized ? <Bell className="h-3 w-3 mr-2" /> : <BellOff className="h-3 w-3 mr-2" />}
              AUDIO FEEDBACK ACTIVO
            </Badge>
          </div>
        </motion.div>

        <div className="text-center space-y-2">
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none">STATUS DA <span className="text-primary italic">FILA</span></h1>
          <p className="text-[10px] text-zinc-600 uppercase font-black tracking-[0.5em] px-1">Sincronização em tempo real absoluta</p>
        </div>

        {minhaPosicao !== -1 && (
          <div className="space-y-8">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="relative"
            >
              {/* Alerta de "Quase lá" se for posição 1 */}
              {minhaPosicao === 1 && !cancelando && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="absolute -top-6 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-black font-black py-2 px-6 rounded-full text-[10px] tracking-widest uppercase shadow-gold animate-pulse whitespace-nowrap"
                >
                  <Sparkles className="h-3 w-3 inline mr-2" /> QUASE SUA VEZ! PREPARE-SE
                </motion.div>
              )}

              <Card className={`relative overflow-hidden border-none shadow-3xl transition-all duration-700 rounded-[4rem] ${filaAguardando[minhaPosicao].status === 'chamado' ? 'bg-primary ring-[16px] ring-primary/20' : 'bg-white/5 backdrop-blur-3xl border border-white/5'}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <CardContent className="p-16 md:p-24 text-center space-y-8 relative z-10">
                  {/* Senha do Usuário */}
                  {filaAguardando[minhaPosicao].numero_senha && (
                    <div className="mb-4">
                      <p className="text-xs font-black uppercase tracking-widest text-zinc-600 mb-2">
                        🎫 SUA SENHA
                      </p>
                      <div className={`inline-block px-8 py-4 rounded-3xl ${filaAguardando[minhaPosicao].status === 'chamado' ? 'bg-black/20' : 'bg-primary/10'} border-2 ${filaAguardando[minhaPosicao].status === 'chamado' ? 'border-black/40' : 'border-primary/30'}`}>
                        <span className={`text-6xl font-black italic tracking-tighter ${filaAguardando[minhaPosicao].status === 'chamado' ? 'text-black' : 'text-primary'}`}>
                          {String(filaAguardando[minhaPosicao].numero_senha).padStart(3, '0')}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className={`text-[11px] font-black uppercase tracking-[0.5em] ${filaAguardando[minhaPosicao].status === 'chamado' ? 'text-black/60' : 'text-primary'}`}>
                      {filaAguardando[minhaPosicao].status === 'chamado' ? 'PREPARE-SE PARA O TRONO' : 'SUA POSIÇÃO ESTABELECIDA'}
                    </p>
                    <div className={`text-[12rem] md:text-[18rem] font-black leading-none drop-shadow-strong tracking-tighter ${filaAguardando[minhaPosicao].status === 'chamado' ? 'text-black animate-bounce' : 'text-white'}`}>
                      #{minhaPosicao + 1}
                    </div>
                  </div>

                  <div className={`inline-flex items-center gap-4 px-12 py-5 rounded-[2rem] font-black uppercase text-[12px] tracking-[0.3em] transition-all shadow-heavy ${filaAguardando[minhaPosicao].status === 'chamado' ? 'bg-black text-white' : 'bg-white/10 text-white border border-white/10'}`}>
                    {filaAguardando[minhaPosicao].status === 'chamado' ? (
                      <><Volume2 className="h-6 w-6 animate-pulse" /> É O SEU MOMENTO!</>
                    ) : (
                      minhaPosicao === 0 ? "VOCÊ É O PRÓXIMO DA LINHA" : minhaPosicao === 1 ? "VOCÊ É O SEGUNDO DA VEZ" : `${minhaPosicao} CLIENTES À FRENTE`
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-8 rounded-[3rem] bg-zinc-900/40 border border-white/5 flex items-center gap-6 backdrop-blur-xl">
                <div className="w-16 h-16 rounded-[1.5rem] bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                  <Bell className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em] mb-1">AUDIOMETRIA</h4>
                  <p className="text-sm font-bold text-white uppercase italic">Status Verde</p>
                </div>
              </div>
              <div className="p-8 rounded-[3rem] bg-zinc-900/40 border border-white/5 flex items-center gap-6 backdrop-blur-xl">
                <div className="w-16 h-16 rounded-[1.5rem] bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                  <Clock className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em] mb-1">TEMPO ESTIMADO</h4>
                  <p className="text-sm font-bold text-white uppercase italic">
                    {tempoEstimado < 60 ? `${tempoEstimado} MIN` : `${Math.floor(tempoEstimado / 60)}H ${tempoEstimado % 60}M`}
                  </p>
                </div>
              </div>
              <div className="p-8 rounded-[3rem] bg-zinc-900/40 border border-white/5 flex items-center gap-6 backdrop-blur-xl">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      disabled={cancelando || filaAguardando[minhaPosicao].status === 'chamado'}
                      className="w-full h-full p-0 hover:bg-red-500/10 transition-all rounded-[3rem] disabled:opacity-30"
                    >
                      <div className="w-16 h-16 rounded-[1.5rem] bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
                        <Trash2 className="h-7 w-7" />
                      </div>
                      <div className="text-left flex-1">
                        <h4 className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em] mb-1">CANCELAR</h4>
                        <p className="text-sm font-bold text-white uppercase italic">Sair da Fila</p>
                      </div>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-zinc-900/95 border-red-500/20 rounded-3xl">
                    <AlertDialogHeader>
                      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="h-8 w-8 text-red-400" />
                      </div>
                      <AlertDialogTitle className="text-center text-2xl font-black uppercase">
                        Confirmar Cancelamento
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-center text-zinc-400">
                        Tem certeza que deseja sair da fila? Você perderá sua posição atual e terá que entrar novamente no final.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-3">
                      <AlertDialogCancel className="rounded-2xl font-bold">
                        Manter Posição
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancelarPosicao}
                        disabled={cancelando}
                        className="bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold"
                      >
                        {cancelando ? "Cancelando..." : "Sim, Sair da Fila"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Fila Progress Panel */}
            <div className="space-y-6 pt-12">
              <div className="flex items-center justify-between px-8">
                <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-zinc-600">ACOMPANHAMENTO VIP</h3>
                <Badge variant="outline" className="border-white/10 text-white/30 uppercase font-black text-[9px] tracking-widest">{filaAguardando.length} ATIVOS</Badge>
              </div>
              <div className="space-y-4">
                {filaAguardando.map((entry, idx) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className={`
                                p-8 rounded-[2.5rem] flex items-center justify-between border transition-all duration-700
                                ${entry.id === meuId ? 'bg-primary/10 border-primary/40 shadow-gold' : 'bg-zinc-900/20 border-white/5 hover:bg-white/[0.03]'}
                            `}>
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black italic ${entry.status === 'chamado' ? 'bg-primary text-black animate-pulse' : 'bg-white/5 text-zinc-700'}`}>
                          {entry.status === 'chamado' ? <Volume2 className="h-6 w-6" /> : idx + 1}
                        </div>
                        <div>
                          <p className={`font-black uppercase italic tracking-tight text-xl ${entry.id === meuId ? 'text-primary' : 'text-white'}`}>
                            {entry.nome} {entry.id === meuId && '(ESTE É VOCÊ)'}
                          </p>
                          <div className="flex items-center gap-3 opacity-40">
                            <Scissors className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{entry.servico_descricao || 'CORTE STYLE'}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`px-5 py-2 rounded-full font-black uppercase text-[9px] tracking-widest border transition-all shadow-md ${entry.status === 'chamado' ? 'bg-primary text-black border-primary' : 'bg-white/5 text-zinc-600 border-white/5'}`}>
                        {entry.status === 'chamado' ? 'CHAMANDO' : 'AGUARDANDO'}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
