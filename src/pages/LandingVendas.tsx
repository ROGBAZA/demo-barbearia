import { motion, useScroll, useTransform } from 'framer-motion';
import {
    Calendar,
    TrendingUp,
    ShieldCheck,
    Zap,
    ArrowRight,
    CheckCircle2,
    Star,
    MessageSquare,
    Cpu,
    Globe,
    Lock,
    Scissors,
    Users,
    Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRef } from 'react';

export default function LandingVendas() {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll();

    const whatsappUrl = "https://wa.me/556798186597?text=Olá!%20Gostaria%20de%20saber%20mais%20sobre%20o%20sistema%20Central%20Barber.";

    const handleContact = () => {
        window.open(whatsappUrl, '_blank');
    };

    const floatingIcons = [
        { icon: <Scissors className="w-12 h-12" />, top: "10%", left: "5%", delay: 0 },
        { icon: <Zap className="w-8 h-8" />, top: "25%", right: "10%", delay: 1 },
        { icon: <Cpu className="w-16 h-16" />, bottom: "20%", left: "15%", delay: 2 },
        { icon: <Globe className="w-10 h-10" />, top: "60%", right: "5%", delay: 1.5 },
    ];

    const features = [
        {
            icon: <Cpu className="w-10 h-10 text-primary" />,
            title: "IA de Gestão Neural",
            desc: "Algoritmos que prevêem horários premium e otimizam sua agenda automaticamente.",
            img: "https://images.unsplash.com/photo-1599351431247-f10b21ce53e2?q=80&w=1888&auto=format&fit=crop"
        },
        {
            icon: <Smartphone className="w-10 h-10 text-primary" />,
            title: "Experiência Mobile 4K",
            desc: "O sistema mais rápido do mercado, com interface fluida e animações de alto nível.",
            img: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070&auto=format&fit=crop"
        },
        {
            icon: <Users className="w-10 h-10 text-primary" />,
            title: "Fila de Espera Digital",
            desc: "Seu cliente acompanha a posição em tempo real com QR Code e alertas.",
            img: "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?q=80&w=2070&auto=format&fit=crop"
        }
    ];

    return (
        <div ref={containerRef} className="min-h-screen bg-[#050608] text-white selection:bg-primary/30 font-sans overflow-x-hidden relative">

            {/* BACKGROUND NEURAL LAYER */}
            <div className="fixed inset-0 pointer-events-none -z-20">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.08)_0%,transparent_50%)]" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay" />

                {/* Floating Particles/Shapes */}
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{
                            x: Math.random() * 2000 - 1000,
                            y: Math.random() * 2000 - 1000,
                            opacity: 0
                        }}
                        animate={{
                            y: [null, Math.random() * 200 - 100],
                            opacity: [0.1, 0.3, 0.1],
                            rotate: [0, 360]
                        }}
                        transition={{
                            duration: 10 + Math.random() * 20,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                        className="absolute w-1 h-20 bg-gradient-to-t from-primary/20 via-primary/5 to-transparent rounded-full blur-sm"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`
                        }}
                    />
                ))}
            </div>

            {/* WHATSAPP FLOAT */}
            <motion.button
                whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                whileTap={{ scale: 0.9 }}
                onClick={handleContact}
                className="fixed bottom-8 right-8 z-[100] p-5 bg-primary text-black rounded-full shadow-[0_0_50px_rgba(212,175,55,0.6)] flex items-center justify-center group overflow-hidden"
            >
                <MessageSquare className="w-8 h-8 fill-black relative z-10" />
                <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-150 transition-transform duration-500 rounded-full" />
            </motion.button>

            {/* HERO SECTION - THE WOW FACTOR */}
            <section className="relative pt-32 pb-60 px-6 max-w-7xl mx-auto flex flex-col items-center">

                {/* Floating Background Icons */}
                {floatingIcons.map((item, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 0.1, scale: 1, y: [0, -20, 0] }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            delay: item.delay,
                            ease: "easeInOut"
                        }}
                        className="absolute text-primary pointer-events-none hidden lg:block"
                        style={{ top: item.top, left: item.left, right: item.right, bottom: item.bottom }}
                    >
                        {item.icon}
                    </motion.div>
                ))}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-3 px-8 py-3 rounded-full bg-white/5 border border-white/10 mb-16 backdrop-blur-3xl shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                >
                    <div className="flex -space-x-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-10 h-10 rounded-full border-2 border-primary bg-zinc-800 flex items-center justify-center font-black text-[10px] text-primary italic">CB</div>
                        ))}
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.4em] text-primary/90 pl-3 border-l border-white/20">Elite Membership Active</span>
                </motion.div>

                <motion.h1
                    style={{ scale: useTransform(scrollYProgress, [0, 0.2], [1, 0.95]) }}
                    className="text-6xl md:text-[10rem] font-black italic uppercase tracking-tighter leading-[0.85] text-center mb-16 relative"
                >
                    <span className="relative z-10 block">Domine Seu</span>
                    <span className="text-primary italic drop-shadow-[0_0_40px_rgba(212,175,55,0.5)] block mt-4 bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent">Império.</span>

                    {/* Cyber Lines */}
                    <div className="absolute top-1/2 left-[-10%] w-[120%] h-[1px] bg-primary/10 -z-10" />
                    <div className="absolute top-1/2 left-[-10%] w-[120%] h-[5px] bg-primary/5 blur-xl -z-10" />
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="text-zinc-500 text-xl md:text-3xl max-w-4xl text-center mb-24 font-light leading-relaxed px-4"
                >
                    Esqueça agendas de papel. Entregamos uma <span className="text-white font-bold">Arquitetura de Gestão Digital</span> que coloca sua barbearia no topo em 24 horas.
                </motion.p>

                <div className="flex flex-col md:flex-row gap-10 w-full justify-center px-4">
                    <Button
                        onClick={handleContact}
                        className="h-28 px-16 bg-primary text-black font-black text-3xl rounded-[2.5rem] shadow-[0_20px_80px_rgba(212,175,55,0.3)] hover:scale-110 active:scale-95 transition-all group relative overflow-hidden italic tracking-tighter"
                    >
                        <span className="relative z-10 uppercase">Solicitar Acesso Elite</span>
                        <Zap className="w-10 h-10 ml-4 fill-black group-hover:animate-pulse" />
                        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/20" />
                    </Button>

                    <Button
                        onClick={handleContact}
                        variant="outline"
                        className="h-28 px-16 border-white/10 bg-white/5 text-white font-black text-3xl rounded-[2.5rem] hover:bg-white/10 transition-all border-dashed uppercase italic tracking-tighter"
                    >
                        Ver Demonstração
                    </Button>
                </div>
            </section>

            {/* 4K VISUAL SHOWCASE - THE CINEMATIC EXPERIENCE */}
            <section className="py-40 px-6 relative overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">

                        <motion.div
                            initial={{ x: -100, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            viewport={{ once: true }}
                            className="space-y-12"
                        >
                            <h2 className="text-6xl md:text-8xl font-black italic uppercase leading-none tracking-tighter">
                                Tecnologia <br /> <span className="text-primary italic">Invisível.</span> <br /> Poder Real.
                            </h2>
                            <p className="text-zinc-500 text-2xl font-light leading-relaxed">
                                Nossa interface foi projetada por especialistas em <span className="text-white font-bold">Behavioral UX</span> para garantir que seus clientes voltem mais vezes.
                            </p>

                            <div className="grid grid-cols-2 gap-8">
                                {stats.map((s, i) => (
                                    <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-md">
                                        <div className="text-4xl font-black text-primary italic mb-2">{s.value}</div>
                                        <div className="text-xs uppercase font-bold text-zinc-600 tracking-widest">{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        <div className="relative">
                            {/* 3D TILT EFFECT CARD */}
                            <motion.div
                                whileHover={{ rotateY: -10, rotateX: 5, scale: 1.05 }}
                                transition={{ duration: 0.8 }}
                                className="w-full aspect-[4/5] rounded-[4rem] bg-zinc-900 border border-white/10 relative overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)]"
                            >
                                <img
                                    src="https://images.unsplash.com/photo-1599351431247-f10b21ce53e2?q=80&w=1888&auto=format&fit=crop"
                                    alt="Elite Barber"
                                    className="w-full h-full object-cover grayscale brightness-50"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />

                                {/* HUD INTERFACE */}
                                <div className="absolute inset-12 border border-primary/20 rounded-[3rem] pointer-events-none" />
                                <div className="absolute top-16 left-16 flex items-center gap-4">
                                    <div className="w-4 h-4 rounded-full bg-primary animate-ping" />
                                    <span className="text-sm font-black uppercase tracking-[0.3em] text-primary">Neural Stream Active</span>
                                </div>

                                <div className="absolute bottom-16 left-16 right-16">
                                    <div className="text-5xl font-black italic text-white mb-4 uppercase tracking-tighter">Status: Premium</div>
                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            whileInView={{ width: "88%" }}
                                            transition={{ duration: 2, delay: 0.5 }}
                                            className="h-full bg-primary shadow-[0_0_15px_rgba(212,175,55,1)]"
                                        />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Floating Elements Around Card */}
                            <motion.div
                                animate={{ y: [-10, 10, -10] }}
                                transition={{ duration: 5, repeat: Infinity }}
                                className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 blur-3xl rounded-full"
                            />
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className="absolute -bottom-20 -left-20 w-80 h-80 border border-primary/10 rounded-full border-dashed"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURES GRID - 3D CARDS */}
            <section className="py-60 px-6 bg-white/[0.01]">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-40">
                        <h2 className="text-6xl md:text-9xl font-black uppercase italic tracking-tighter mb-8 leading-none">A Revolução <br /> <span className="text-primary italic">Central.</span></h2>
                        <p className="text-zinc-500 text-2xl font-light">Prepare sua equipe para o próximo nível de produtividade.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {features.map((f, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ y: -20, rotateY: 5 }}
                                className="p-12 rounded-[4rem] bg-zinc-900 shadow-2xl border border-white/5 relative overflow-hidden group h-full"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="p-6 bg-primary/20 rounded-3xl w-fit mb-12 shadow-gold border border-primary/40">
                                    {f.icon}
                                </div>
                                <h3 className="text-4xl font-black text-white mb-6 italic uppercase tracking-tighter">{f.title}</h3>
                                <p className="text-zinc-400 text-xl font-light mb-12 leading-relaxed">{f.desc}</p>
                                <div className="w-full aspect-video rounded-3xl overflow-hidden border border-white/10 group-hover:scale-105 transition-transform duration-700">
                                    <img src={f.img} alt={f.title} className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 transition-all duration-700" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PRICING - THE ELITE EXPERIENCE */}
            <section className="py-60 px-4 md:px-6 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-40">
                        <h2 className="text-7xl md:text-[10rem] font-black italic tracking-tighter uppercase leading-none opacity-10 absolute -top-20 left-1/2 -translate-x-1/2 -z-10 w-full">PRICING MODEL</h2>
                        <h2 className="text-6xl md:text-9xl font-black italic uppercase italic tracking-tighter mb-8 bg-gradient-to-b from-white to-zinc-600 bg-clip-text text-transparent">Invista No Seu <br /> <span className="text-primary tracking-normal">Legado.</span></h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch max-w-7xl mx-auto">
                        {/* Plan 1 */}
                        <div className="p-8 rounded-[3rem] bg-zinc-900 border border-white/5 flex flex-col opacity-60 hover:opacity-100 transition-all">
                            <div className="text-zinc-500 font-black mb-6 uppercase tracking-[0.4em] text-[10px]">Standard Core</div>
                            <div className="text-5xl font-black mb-8 italic">R$ 49<span className="text-2xl">,99</span> <span className="text-sm block text-zinc-600 mt-2">/ mensal</span></div>
                            <ul className="space-y-4 mb-8 flex-1 text-zinc-400 text-sm">
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-primary" /> Agendamento Neural</li>
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-primary" /> Fila VIP Digital</li>
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-primary" /> Relatórios 1.0</li>
                            </ul>
                            <Button onClick={handleContact} variant="outline" className="h-14 rounded-2xl border-white/10 font-black uppercase text-xs hover:bg-white/5">Escolher Plano</Button>
                        </div>

                        {/* Plan 2 - RECOMENDADO */}
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="p-10 rounded-[3.5rem] bg-gradient-to-br from-primary/30 to-black border-2 border-primary shadow-[0_40px_100px_rgba(212,175,55,0.2)] flex flex-col z-10 relative"
                        >
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-black px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.4em] shadow-gold whitespace-nowrap">Most Valuable</div>
                            <div className="text-primary font-black mb-6 uppercase tracking-[0.4em] text-[10px]">Elite Performance</div>
                            <div className="text-6xl font-black mb-10 italic text-white drop-shadow-gold">R$ 139<span className="text-3xl">,99</span> <span className="text-sm block text-zinc-500 mt-2 font-bold">Trimestral (Best Deal)</span></div>
                            <ul className="space-y-6 mb-10 flex-1 text-zinc-100 text-base font-light italic">
                                <li className="flex items-center gap-3"><Star className="w-5 h-5 text-primary fill-primary" /> Suporte Neural 24/7</li>
                                <li className="flex items-center gap-3"><Star className="w-5 h-5 text-primary fill-primary" /> Comissões Automatizadas</li>
                                <li className="flex items-center gap-3"><Star className="w-5 h-5 text-primary fill-primary" /> Gestão Multi-Profissional</li>
                            </ul>
                            <Button onClick={handleContact} className="h-16 rounded-2xl bg-primary text-black font-black uppercase text-lg shadow-gold hover:scale-105 transition-all italic tracking-tighter">Assinar Agora</Button>
                        </motion.div>

                        {/* Plan 3 */}
                        <div className="p-8 rounded-[3rem] bg-zinc-900 border border-white/5 flex flex-col opacity-60 hover:opacity-100 transition-all">
                            <div className="text-zinc-500 font-black mb-6 uppercase tracking-[0.4em] text-[10px]">Pro Growth</div>
                            <div className="text-5xl font-black mb-8 italic">R$ 269<span className="text-2xl">,99</span> <span className="text-sm block text-zinc-600 mt-2">/ semestral</span></div>
                            <ul className="space-y-4 mb-8 flex-1 text-zinc-400 text-sm">
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-primary" /> Tudo do Trimestral</li>
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-primary" /> Auditoria de Marketing</li>
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-primary" /> Desconto de 10%</li>
                            </ul>
                            <Button onClick={handleContact} variant="outline" className="h-14 rounded-2xl border-white/10 font-black uppercase text-xs hover:bg-white/5">Escolher Plano</Button>
                        </div>

                        {/* Plan 4 */}
                        <div className="p-8 rounded-[3rem] bg-zinc-900 border border-white/5 flex flex-col opacity-60 hover:opacity-100 transition-all">
                            <div className="text-zinc-500 font-black mb-6 uppercase tracking-[0.4em] text-[10px]">Legacy King</div>
                            <div className="text-5xl font-black mb-8 italic">R$ 499<span className="text-2xl">,99</span> <span className="text-sm block text-zinc-600 mt-2">/ anual</span></div>
                            <ul className="space-y-4 mb-8 flex-1 text-zinc-400 text-sm">
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-primary" /> Domínio .com.br Grátis</li>
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-primary" /> Consultoria de Branding</li>
                                <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-primary" /> Beta Tester - AI v3</li>
                            </ul>
                            <Button onClick={handleContact} variant="outline" className="h-14 rounded-2xl border-white/10 font-black uppercase text-xs hover:bg-white/5">Escolher Plano</Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* FINAL FOOTER - THE LAST IMPRESSION */}
            <footer className="pt-60 pb-80 px-4 md:px-6 text-center relative border-t border-white/5 overflow-hidden">

                {/* Floating Background Text */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[30rem] font-black opacity-[0.02] pointer-events-none uppercase italic italic tracking-tighter whitespace-nowrap">
                    CENTRAL BARBER
                </div>

                <motion.h2
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    className="text-6xl md:text-[12rem] font-black italic uppercase tracking-tighter mb-24 leading-none"
                >
                    Seja o <span className="text-primary italic">Líder.</span> <br /> Comece <span className="underline decoration-primary/30">Lá.</span>
                </motion.h2>

                <motion.button
                    onClick={handleContact}
                    className="h-32 px-24 bg-primary text-black font-black text-4xl md:text-5xl rounded-[3rem] shadow-[0_0_100px_rgba(212,175,55,0.5)] hover:scale-110 active:scale-95 transition-all group relative overflow-hidden italic tracking-tighter"
                >
                    <span className="relative z-10 uppercase">Gero Meu Sucesso Agora!</span>
                    <ArrowRight className="w-12 h-12 md:w-16 md:h-16 ml-6 stroke-[4] relative z-10" />
                    <div className="absolute inset-x-0 bottom-0 h-2 bg-black/20" />
                </motion.button>

                <div className="mt-60 space-y-12 opacity-40">
                    <div className="text-xs font-black uppercase tracking-[0.8em] text-zinc-500">Central Barber © 2026 - Engineered for Prestige</div>
                    <div className="flex justify-center gap-8">
                        {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-8 h-8 text-primary fill-primary animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />)}
                    </div>
                </div>
            </footer>

            {/* GLOBAL HUD OVERLAYS */}
            <div className="fixed top-8 left-8 flex flex-col gap-4 pointer-events-none opacity-20 z-50">
                <div className="flex gap-2">
                    <div className="w-[1px] h-4 bg-primary" />
                    <div className="w-[1px] h-8 bg-primary" />
                    <div className="w-[1px] h-6 bg-primary" />
                </div>
                <div className="text-[8px] font-black uppercase tracking-widest">System Monitor v4.0</div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .shadow-gold {
          box-shadow: 0 10px 40px -10px rgba(212,175,55,0.4);
        }
        .drop-shadow-gold {
          filter: drop-shadow(0 0 20px rgba(212,175,55,0.3));
        }
        html {
          scrollbar-width: thin;
          scrollbar-color: #D4AF37 transparent;
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-thumb {
          background-color: #D4AF37;
          border-radius: 10px;
        }
      `}} />
        </div>
    );
}
