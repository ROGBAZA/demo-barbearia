import { useState } from 'react';
import { Check, Zap, Rocket, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function StripePricing() {
    const { tenant } = useTenant();
    const { toast } = useToast();
    const [billingCycle, setBillingCycle] = useState<'month' | 'quarter' | 'semester' | 'year'>('month');
    const [loading, setLoading] = useState(false);

    const handleUpgrade = async (planName: string) => {
        if (!tenant?.id) return;

        if (planName.includes('Starter') || planName.includes('Gratuito')) {
            toast({
                title: "Plano Gratuito",
                description: "Este plano já está ativo ou não requer pagamento.",
            });
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                body: {
                    tenantId: tenant.id,
                    slug: tenant.slug,
                    origin: window.location.origin,
                    interval: billingCycle
                }
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error('URL de pagamento não gerada.');
            }

        } catch (error: any) {
            console.error('Checkout Error:', error);
            let errorMessage = "Erro ao processar o pagamento.";
            if (error.context) {
                try {
                    const responseBody = await error.context.json();
                    if (responseBody.error) errorMessage = responseBody.error;
                } catch (e) { }
            } else if (error.message) {
                errorMessage = error.message;
            }

            toast({
                title: "Falha no Checkout",
                description: errorMessage,
                variant: "destructive"
            });
            setLoading(false);
        }
    };

    const isProfissional = tenant?.plano === 'PROFISSIONAL';

    const renderPrice = () => {
        switch (billingCycle) {
            case 'year': return { price: 'R$ 499,99', period: '/ano', economy: 'Economia de R$ 99', limitTxt: 'Barbeiros Ilimitados' };
            case 'semester': return { price: 'R$ 269,99', period: '/semestre', economy: 'Economia de R$ 29', limitTxt: 'Até 10 barbeiros' };
            case 'quarter': return { price: 'R$ 139,99', period: '/trimestre', economy: 'Economia de R$ 9', limitTxt: 'Até 5 barbeiros (Outros cargos ilimitados)' };
            default: return { price: 'R$ 49,99', period: '/mês', economy: 'Teste grátis de 7 dias', limitTxt: 'Até 2 barbeiros (Outros cargos ilimitados)' };
        }
    };

    const priceInfo = renderPrice();

    const plans = [
        {
            name: 'Starter (Gratuito)',
            price: 'R$ 0',
            description: 'Ideal para começar',
            features: [
                'Até 2 barbeiros',
                'Fila de espera inteligente',
                'Agendamento online'
            ],
            current: !isProfissional,
            icon: Rocket,
            color: "zinc-400"
        },
        {
            name: 'Profissional',
            price: priceInfo.price,
            period: priceInfo.period,
            description: 'O motor da sua barbearia',
            features: [
                priceInfo.limitTxt,
                'Relatórios avançados 3.0',
                'Gestão de Comissões VIP',
                'Suporte prioritário',
                priceInfo.economy
            ],
            current: isProfissional,
            recommended: true,
            icon: Zap,
            color: "primary"
        }
    ];

    return (
        <div className="space-y-12 py-12">
            <div className="text-center space-y-6 max-w-2xl mx-auto">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-4 py-1 tracking-widest font-black uppercase text-[10px]">
                    Pagamento Seguro via Stripe
                </Badge>
                <h2 className="text-5xl font-black text-white tracking-tighter">Escolha seu <span className="text-primary italic">Plano</span></h2>

                {/* NOVO SELETOR DE 3 CICLOS */}
                <div className="inline-flex p-1 bg-white/5 border border-white/10 rounded-2xl gap-1">
                    <button
                        type="button"
                        onClick={() => setBillingCycle('month')}
                        className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${billingCycle === 'month' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-white'}`}
                    >
                        Mensal
                    </button>
                    <button
                        type="button"
                        onClick={() => setBillingCycle('quarter')}
                        className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${billingCycle === 'quarter' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-white'}`}
                    >
                        Trimestral
                        {billingCycle !== 'quarter' && <span className="absolute -top-2 -right-2 bg-emerald-500 text-[8px] px-1.5 rounded-full text-black">Oferta</span>}
                    </button>
                    <button
                        type="button"
                        onClick={() => setBillingCycle('semester')}
                        className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${billingCycle === 'semester' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-white'}`}
                    >
                        Semestral
                        {billingCycle !== 'semester' && <span className="absolute -top-2 -right-2 bg-emerald-500 text-[8px] px-1.5 rounded-full text-black">-10%</span>}
                    </button>
                    <button
                        type="button"
                        onClick={() => setBillingCycle('year')}
                        className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${billingCycle === 'year' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-white'}`}
                    >
                        Anual
                        {billingCycle !== 'year' && <span className="absolute -top-2 -right-2 bg-emerald-500 text-[8px] px-1.5 rounded-full text-black">-17%</span>}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto px-4 text-left">
                {plans.map((plan) => (
                    <Card key={plan.name} className={`relative overflow-hidden bg-black/40 border-white/5 backdrop-blur-3xl transition-all duration-700 hover:scale-[1.01] ${plan.recommended && !plan.current ? 'border-primary/40 shadow-gold' : ''}`}>
                        {plan.recommended && !plan.current && (
                            <div className="absolute top-0 right-0">
                                <Badge className="rounded-none rounded-bl-3xl bg-primary text-black font-black px-6 py-2 shadow-2xl">RECOMENDADO</Badge>
                            </div>
                        )}

                        <CardHeader className="space-y-6 p-8">
                            <div className={`w-16 h-16 rounded-[2rem] bg-white/5 flex items-center justify-center border border-white/10 group`}>
                                <plan.icon className={`w-8 h-8 text-primary group-hover:scale-110 transition-transform`} />
                            </div>
                            <div>
                                <CardTitle className="text-3xl font-black text-white tracking-tight">{plan.name}</CardTitle>
                                <CardDescription className="text-muted-foreground text-md">{plan.description}</CardDescription>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-8 px-8">
                            <div className="flex items-baseline gap-2">
                                <span className="text-6xl font-black text-white tracking-tighter">{plan.price}</span>
                                <span className="text-muted-foreground font-bold text-sm uppercase tracking-widest">{plan.period}</span>
                            </div>

                            <ul className="space-y-5">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-4 text-sm text-white/80 font-medium">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                        </div>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>

                        <CardFooter className="p-8">
                            <Button
                                type="button"
                                className={`w-full h-16 rounded-[2rem] font-black text-xl transition-all overflow-hidden relative group ${plan.recommended && !plan.current ? 'bg-primary text-black hover:bg-primary/90' : 'bg-white/5 text-white hover:bg-white/10'}`}
                                disabled={plan.current || loading}
                                onClick={() => !plan.current && handleUpgrade(plan.name)}
                            >
                                <AnimatePresence mode="wait">
                                    {loading ? (
                                        <motion.div key="loading" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-3">
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            <span className="text-sm uppercase tracking-[0.2em]">
                                                REDIRECIONANDO...
                                            </span>
                                        </motion.div>
                                    ) : plan.current ? (
                                        <motion.div key="current" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                                            <ShieldCheck className="w-6 h-6 text-emerald-500" />
                                            PLANO ATIVO
                                        </motion.div>
                                    ) : (
                                        <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 group-hover:scale-105 transition-transform">
                                            <CreditCard className="w-6 h-6" />
                                            ASSINAR AGORA
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <div className="flex flex-col items-center gap-4 py-8">
                <div className="flex items-center gap-6 opacity-40">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-8 brightness-0 invert" />
                    <div className="w-px h-6 bg-white/20" />
                    <div className="flex items-center gap-2 text-white font-black text-[10px] tracking-widest uppercase">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        Ambiente Seguro
                    </div>
                </div>
            </div>
        </div>
    );
}
