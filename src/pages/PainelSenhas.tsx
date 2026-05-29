import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilaEntry {
    id: string;
    numero_senha: number;
    nome: string;
    status: 'aguardando' | 'chamado' | 'em_atendimento' | 'atendido' | 'cancelado';
    created_at: string;
}

export default function PainelSenhas() {
    const { tenant } = useTenant();
    const [currentSenha, setCurrentSenha] = useState<number | null>(null);
    const [proximasSenhas, setProximasSenhas] = useState<number[]>([]);

    // Buscar fila do dia atual
    const { data: fila, refetch } = useQuery({
        queryKey: ['fila-senhas', tenant?.id],
        queryFn: async () => {
            if (!tenant?.id) return [];

            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('fila_espera')
                .select('*')
                .eq('tenant_id', tenant.id)
                .gte('created_at', `${today}T00:00:00`)
                .lte('created_at', `${today}T23:59:59`)
                .order('numero_senha', { ascending: true });

            if (error) throw error;
            return data as FilaEntry[];
        },
        enabled: !!tenant?.id,
        refetchInterval: 3000 // Atualiza a cada 3 segundos
    });

    // Atualizar senhas em tempo real
    useEffect(() => {
        if (!fila) return;

        // Senha atual = a que está em atendimento ou foi chamada
        const current = fila.find(f => f.status === 'em_atendimento' || f.status === 'chamado');
        setCurrentSenha(current?.numero_senha || null);

        // Próximas 3 senhas aguardando
        const proximas = fila
            .filter(f => f.status === 'aguardando')
            .slice(0, 3)
            .map(f => f.numero_senha);
        setProximasSenhas(proximas);
    }, [fila]);

    // Subscrição em tempo real via Supabase Realtime
    useEffect(() => {
        if (!tenant?.id) return;

        const channel = supabase
            .channel('public:fila_espera')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'fila_espera',
                    filter: `tenant_id=eq.${tenant.id}`
                },
                () => {
                    refetch();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tenant?.id, refetch]);

    if (!tenant) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <p className="text-white text-2xl font-bold">Carregando...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 text-white p-8 overflow-hidden">
            {/* Header */}
            <div className="text-center mb-12">
                <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter mb-4">
                    {tenant.nome}
                </h1>
                <p className="text-zinc-500 text-xl font-bold uppercase tracking-widest">
                    Painel de Senhas
                </p>
            </div>

            {/* Senha Atual - Destaque */}
            <div className="max-w-6xl mx-auto mb-12">
                <AnimatePresence mode="wait">
                    {currentSenha ? (
                        <motion.div
                            key={currentSenha}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <Card className="bg-gradient-to-r from-primary/20 to-amber-600/20 border-2 border-primary shadow-[0_0_50px_rgba(var(--primary-rgb),0.3)] p-12 rounded-[3rem]">
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-4 mb-6">
                                        <Bell className="w-12 h-12 text-primary animate-bounce" />
                                        <p className="text-3xl font-black uppercase tracking-widest text-primary">
                                            CHAMANDO AGORA
                                        </p>
                                    </div>
                                    <div className="text-[180px] md:text-[240px] font-black italic leading-none text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">
                                        {String(currentSenha).padStart(3, '0')}
                                    </div>
                                    <p className="text-2xl font-bold uppercase tracking-widest text-zinc-400 mt-6">
                                        Dirija-se ao atendimento
                                    </p>
                                </div>
                            </Card>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="vazio"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <Card className="bg-zinc-900/40 border-white/10 p-16 rounded-[3rem] text-center">
                                <p className="text-4xl font-black uppercase text-zinc-600 tracking-widest">
                                    Aguardando Próximo Cliente
                                </p>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Próximas Senhas */}
            {proximasSenhas.length > 0 && (
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl font-black uppercase tracking-tighter mb-6 text-center text-zinc-500">
                        Próximos
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {proximasSenhas.map((senha, index) => (
                            <motion.div
                                key={senha}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="bg-zinc-900/60 border-white/10 p-8 rounded-3xl text-center hover:bg-zinc-900/80 transition-all">
                                    <Badge className="mb-4 bg-zinc-800 text-zinc-400 font-black text-xs">
                                        {index + 1}º
                                    </Badge>
                                    <p className="text-6xl font-black italic text-zinc-300">
                                        {String(senha).padStart(3, '0')}
                                    </p>
                                    <p className="text-sm font-bold uppercase text-zinc-600 mt-3 tracking-widest">
                                        Aguardando
                                    </p>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer - Estatísticas */}
            <div className="fixed bottom-8 left-0 right-0 flex justify-center gap-8">
                <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3">
                    <p className="text-xs font-black uppercase text-zinc-600 tracking-widest">Senhas Hoje</p>
                    <p className="text-3xl font-black italic text-primary">{fila?.length || 0}</p>
                </div>
                <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3">
                    <p className="text-xs font-black uppercase text-zinc-600 tracking-widest">Aguardando</p>
                    <p className="text-3xl font-black italic text-amber-500">
                        {fila?.filter(f => f.status === 'aguardando').length || 0}
                    </p>
                </div>
            </div>
        </div>
    );
}
