import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building2, User, Mail, Lock, ChevronLeft, Sparkles, Scissors, Crown, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useEffect } from 'react';

export default function NovoTenant() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user, refresh } = useAuth();
    const { tenant, loading: tenantLoading } = useTenant();

    // Redirecionar se já tiver uma barbearia vinculada
    useEffect(() => {
        if (!tenantLoading && tenant?.slug) {
            console.log('🚀 Usuário já possui barbearia. Redirecionando para dashboard...');
            navigate(`/t/${tenant.slug}/dashboard`, { replace: true });
        }
    }, [tenant, tenantLoading, navigate]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nomeBarbearia: '',
        slug: '',
        nomeDono: '',
        email: '',
        senha: '',
        confirmarSenha: ''
    });

    const handleSlug = (nome: string) => {
        return nome
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.senha !== formData.confirmarSenha) {
            toast({ title: 'Erro de Validação', description: 'As senhas não coincidem.', variant: 'destructive' });
            return;
        }

        setLoading(true);
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            let activeUser = currentUser;

            if (!activeUser) {
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.senha,
                    options: {
                        data: {
                            nome: formData.nomeDono,
                            cargo: 'admin',
                            role: 'admin'
                        }
                    }
                });

                if (authError) {
                    if (authError.message.includes("already registered")) {
                        toast({
                            title: 'Conta Existente',
                            description: 'Este e-mail já está cadastrado. Faça login para assumir sua barbearia.',
                            variant: 'destructive'
                        });
                        return;
                    }
                    throw authError;
                }
                activeUser = authData.user;
            }

            if (!activeUser) throw new Error("Falha crítica na autenticação.");

            const { data: res, error: wizardError } = await (supabase.rpc('create_new_tenant_wizard', {
                _nome_barbearia: formData.nomeBarbearia,
                _slug: formData.slug || handleSlug(formData.nomeBarbearia),
                _nome_dono: formData.nomeDono,
                _email: formData.email
            }) as any);

            if (wizardError) throw wizardError;

            if (res && res.tenant_id) {
                console.log('Ambiente Criado com Sucesso. ID:', res.tenant_id);
                // IMPORTANTE: Atualizar o metadata do usuário
                await supabase.auth.updateUser({
                    data: { tenant_id: res.tenant_id }
                });
            }

            toast({
                title: '👑 ESTABELECIMENTO CRIADO',
                description: 'Seu império de luxo foi estabelecido. Prepare-se para a experiência premium.',
                className: "bg-primary text-black font-bold border-none"
            });

            // Aguardar sincronização mínima e renovar a sessão para atualizar metadados
            console.log('🔄 Sincronizando sessão e permissões...');
            await supabase.auth.refreshSession();

            await refresh();

            // Aguardar um pouco mais para garantir que o banco processou as triggers/RPC
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Redireciona direto para o dashboard do novo tenant com recarregamento completo para zerar o estado
            const finalSlug = formData.slug || handleSlug(formData.nomeBarbearia);
            window.location.href = `/t/${finalSlug}/dashboard`;
        } catch (error: any) {
            console.error(error);
            toast({
                title: 'Ops! Algo deu errado',
                description: error.message || 'Erro inesperado na criação.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020305] flex items-center justify-center p-4 relative overflow-hidden">

            {/* Cinematic Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-amber-500/5" />
                <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-primary/10 blur-[150px] rounded-full opacity-40 animate-pulse" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[70%] h-[70%] bg-amber-600/5 blur-[150px] rounded-full opacity-40" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl w-full relative z-10"
            >
                <button
                    onClick={() => navigate('/auth')}
                    className="mb-8 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-widest"
                >
                    <ChevronLeft className="w-4 h-4" /> Voltar ao Acesso
                </button>

                <div className="bg-black/40 backdrop-blur-[60px] border border-white/[0.08] rounded-[3rem] p-8 lg:p-12 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)]">

                    <div className="flex flex-col items-center text-center mb-10 space-y-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-primary via-primary-glow to-amber-700 rounded-[2rem] flex items-center justify-center shadow-gold p-[2px]">
                            <div className="w-full h-full bg-[#020305] rounded-[1.95rem] flex items-center justify-center">
                                <Crown className="w-8 h-8 text-primary" />
                            </div>
                        </div>
                        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                            FORGE SEU <span className="text-primary underline decoration-primary/30 underline-offset-8">IMPÉRIO</span>
                        </h1>
                        <p className="text-zinc-500 font-medium max-w-sm">
                            Configure seu estabelecimento de elite abaixo. Tudo é isolado, seguro e exclusivo.
                        </p>
                    </div>

                    <form onSubmit={handleRegister} className="grid md:grid-cols-2 gap-8">
                        {/* Section 1: Establishment */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-primary/80 mb-2">
                                <Sparkles className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Estabelecimento</span>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest ml-1">Nome da Marca</Label>
                                <div className="relative group">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        placeholder="Ex: Barber Shop Royal"
                                        className="pl-12 h-14 bg-white/[0.03] border-white/10 rounded-2xl focus:ring-primary focus:bg-white/[0.05] transition-all"
                                        value={formData.nomeBarbearia}
                                        onChange={e => setFormData({ ...formData, nomeBarbearia: e.target.value, slug: handleSlug(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest ml-1">Link Exclusivo (/t/slug)</Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        placeholder="sua-marca"
                                        className="h-14 bg-white/[0.03] border-white/10 rounded-2xl px-6 font-mono text-primary text-sm focus:ring-primary transition-all"
                                        value={formData.slug}
                                        onChange={e => setFormData({ ...formData, slug: handleSlug(e.target.value) })}
                                        required
                                    />
                                </div>
                                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest px-1 italic flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Isolamento lógico individual
                                </p>
                            </div>
                        </div>

                        {/* Section 2: Owner */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-primary/80 mb-2">
                                <User className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Identidade do Dono</span>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest ml-1">Seu Nome</Label>
                                <Input
                                    placeholder="Nome Completo"
                                    className="h-14 bg-white/[0.03] border-white/10 rounded-2xl px-6 focus:ring-primary transition-all"
                                    value={formData.nomeDono}
                                    onChange={e => setFormData({ ...formData, nomeDono: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-3">
                                <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest ml-1">Email Principal</Label>
                                <Input
                                    type="email"
                                    placeholder="seu@contato.com"
                                    className="h-14 bg-white/[0.03] border-white/10 rounded-2xl px-6 focus:ring-primary transition-all"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-6">
                            <div className="flex items-center gap-2 text-primary/80 mb-2">
                                <Lock className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Segurança do Painel</span>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest ml-1">Senha de Acesso</Label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        className="h-14 bg-white/[0.03] border-white/10 rounded-2xl px-6 focus:ring-primary transition-all"
                                        value={formData.senha}
                                        onChange={e => setFormData({ ...formData, senha: e.target.value })}
                                        required
                                        minLength={8}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest ml-1">Confirmar Senha</Label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        className="h-14 bg-white/[0.03] border-white/10 rounded-2xl px-6 focus:ring-primary transition-all"
                                        value={formData.confirmarSenha}
                                        onChange={e => setFormData({ ...formData, confirmarSenha: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 mt-4 space-y-6">
                            <Button
                                type="submit"
                                className="w-full h-[72px] bg-primary text-black font-black uppercase text-sm tracking-[0.2em] rounded-3xl shadow-[0_12px_48px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_12px_64px_rgba(var(--primary-rgb),0.5)] hover:scale-[1.01] active:scale-[0.98] transition-all"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : "INAUGURAR AMBIENTE VIP"}
                            </Button>

                            <p className="text-center text-[9px] text-zinc-600 font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                                <Scissors className="w-3 h-3" /> Powered by Central Barber Engine
                            </p>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}

function Loader2(props: any) {
    return <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} {...props}>
        <Sparkles className="w-6 h-6" />
    </motion.div>
}
