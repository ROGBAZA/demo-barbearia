import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    Calendar,
    Clock,
    User,
    LogOut,
    CalendarCheck,
    Crown,
    Scissors,
    Sparkles,
    ChevronRight,
    Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import logoPng from '@/assets/logo.png';
import logoJpg from '@/assets/logoooo.jpg';

export default function DashboardCliente() {
    const { cliente, signOut } = useAuth();
    const { tenant } = useTenant();
    const navigate = useNavigate();

    const { data: agendamentos, isLoading } = useQuery({
        queryKey: ['agendamentos-cliente', cliente?.id, tenant?.id],
        queryFn: async () => {
            if (!cliente?.id) return [];
            const { data, error } = await supabase
                .from('agendamentos')
                .select(`
                  *,
                  servicos (nome, preco),
                  funcionarios (nome)
                `)
                .eq('cliente_id', cliente.id)
                .eq('tenant_id', tenant?.id)
                .order('data_hora', { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!cliente?.id && !!tenant?.id
    });

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#020305] flex items-center justify-center">
                <div className="space-y-4 text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-primary font-black uppercase tracking-widest text-xs">Acessando o Templo...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#020305] text-white p-4 md:p-8 selection:bg-primary/30">

            {/* Background Glows */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full opacity-40" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-zinc-800/10 blur-[150px] rounded-full opacity-40" />
            </div>

            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="max-w-6xl mx-auto space-y-12"
            >
                {/* Elite Client Header */}
                <motion.div
                    variants={itemVariants}
                    className="relative overflow-hidden rounded-[3rem] border border-white/5 bg-zinc-900/40 backdrop-blur-3xl p-8 md:p-12 shadow-3xl group"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />

                    <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="text-center md:text-left space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                                <Crown className="w-3.5 h-3.5 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Status: VIP Member</span>
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
                                <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter leading-none">
                                    OLÁ, <span className="text-primary">{cliente?.nome?.split(' ')[0].toUpperCase()}</span>
                                </h1>
                            </div>
                            <p className="text-zinc-500 font-medium text-lg">Seu próximo visual impecável está te esperando.</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button
                                variant="ghost"
                                onClick={async () => {
                                    await signOut?.();
                                    navigate('/auth');
                                }}
                                className="h-14 px-8 rounded-2xl border border-white/5 font-black uppercase tracking-widest text-xs hover:bg-white/5 transition-all"
                            >
                                <LogOut className="mr-2 h-4 w-4" /> Sair
                            </Button>
                            <Button
                                onClick={() => {
                                    if (tenant?.slug) {
                                        navigate(`/t/${tenant.slug}/agendar`);
                                    } else {
                                        navigate('/agendar');
                                    }
                                }}
                                className="h-14 px-10 rounded-2xl bg-white text-black hover:bg-primary hover:text-white transition-all font-black uppercase tracking-widest text-xs shadow-xl active:scale-95"
                            >
                                <CalendarCheck className="mr-2 h-5 w-5" />
                                Reservar Serviço
                            </Button>
                        </div>
                    </div>
                </motion.div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                    {/* Appointments History */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-4">
                                <Sparkles className="w-6 h-6 text-primary" />
                                Seus Atendimentos
                            </h2>
                            <Badge variant="outline" className="border-white/10 text-zinc-500 font-bold">
                                {agendamentos?.length || 0} TOTAL
                            </Badge>
                        </div>

                        <ScrollArea className="h-[600px] pr-4">
                            {agendamentos && agendamentos.length > 0 ? (
                                <div className="space-y-6">
                                    {agendamentos.map((a: any, index: number) => (
                                        <motion.div
                                            key={a.id}
                                            variants={itemVariants}
                                            className="group"
                                        >
                                            <Card className="bg-zinc-900/20 border-white/5 hover:border-primary/20 transition-all duration-500 rounded-3xl overflow-hidden shadow-2xl">
                                                <CardContent className="p-8">
                                                    <div className="flex items-center justify-between mb-8">
                                                        <div className="flex items-center gap-6">
                                                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                                                <Scissors className="w-8 h-8" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-2xl font-black italic tracking-tighter text-white">{a.servicos?.nome}</h3>
                                                                <p className="text-zinc-500 font-bold text-sm uppercase tracking-widest">PRO: {a.funcionarios?.nome}</p>
                                                            </div>
                                                        </div>
                                                        <Badge className={`
                                                            px-4 py-1.5 rounded-full font-black uppercase text-[10px] tracking-widest
                                                            ${a.status === 'concluido' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-400/20' : 'bg-primary/10 text-primary border-primary/20'}
                                                        `}>
                                                            {a.status}
                                                        </Badge>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                                                        <div className="space-y-2">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block">DATA</span>
                                                            <div className="flex items-center gap-3 text-white font-bold">
                                                                <Calendar className="h-5 w-5 text-primary" />
                                                                {format(new Date(a.data_hora), "dd/MM/yyyy", { locale: ptBR })}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block">HORÁRIO</span>
                                                            <div className="flex items-center gap-3 text-white font-bold">
                                                                <Clock className="h-5 w-5 text-primary" />
                                                                {format(new Date(a.data_hora), 'HH:mm')}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block">VALOR</span>
                                                            <div className="text-emerald-400 text-2xl font-black italic tracking-tighter">
                                                                R$ {Number(a.servicos?.preco || 0).toFixed(2)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <motion.div variants={itemVariants} className="text-center py-20 border-2 border-dashed border-white/5 rounded-[3rem]">
                                    <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-8">
                                        <Search className="w-10 h-10 text-zinc-700" />
                                    </div>
                                    <h3 className="text-2xl font-black italic tracking-tighter text-white mb-4">Agenda em Branco</h3>
                                    <p className="text-zinc-500 font-medium mb-8 max-w-xs mx-auto">Você ainda não viveu a experiência no tempo. Agende seu primeiro corte agora.</p>
                                    <Button
                                        onClick={() => {
                                            if (tenant?.slug) {
                                                navigate(`/t/${tenant.slug}/agendar`);
                                            } else {
                                                navigate('/agendar');
                                            }
                                        }}
                                        className="h-14 px-10 rounded-2xl bg-white text-black hover:bg-primary font-black uppercase tracking-widest text-xs shadow-xl"
                                    >
                                        Descobrir Serviços
                                    </Button>
                                </motion.div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Elite Sidebar */}
                    <motion.div variants={itemVariants} className="space-y-8">
                        <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden shadow-3xl">
                            <CardHeader className="p-8 border-b border-white/5">
                                <CardTitle className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                                    <User className="w-6 h-6 text-primary" /> Seu Perfil VIP
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="p-6 rounded-[2rem] bg-[#020305]/60 border border-white/5 flex flex-col gap-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">NOME COMPLETO</span>
                                        <span className="text-white font-black italic uppercase tracking-tight">{cliente?.nome}</span>
                                    </div>
                                    <div className="p-6 rounded-[2rem] bg-[#020305]/60 border border-white/5 flex flex-col gap-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">CONTATO DIGITAL</span>
                                        <span className="text-zinc-400 font-bold text-sm truncate">{cliente?.email}</span>
                                    </div>
                                    {cliente?.telefone && (
                                        <div className="p-6 rounded-[2rem] bg-[#020305]/60 border border-white/5 flex flex-col gap-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">LINHA PRIVADA</span>
                                            <span className="text-primary font-black tracking-widest">{cliente.telefone}</span>
                                        </div>
                                    )}
                                </div>
                                <Button className="w-full h-14 rounded-2xl bg-zinc-800 text-white hover:bg-white hover:text-black transition-all font-black uppercase tracking-widest text-[10px]">
                                    Editar Protocolo
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Promo / Info Card */}
                        <div className="relative overflow-hidden rounded-[2.5rem] bg-primary p-8 text-black shadow-gold group cursor-pointer">
                            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-125 transition-transform">
                                <Sparkles className="w-20 h-20" />
                            </div>
                            <h4 className="text-2xl font-black italic italic tracking-tighter leading-none mb-4 uppercase">Torne-se Lenda</h4>
                            <p className="text-sm font-bold opacity-80 mb-6">Convide um amigo para o templo e ganhe 50% de bônus no seu próximo corte.</p>
                            <Button className="w-full bg-black text-white hover:bg-zinc-900 rounded-xl font-black uppercase tracking-widest text-[10px] gap-4">
                                Convidar Agora <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
