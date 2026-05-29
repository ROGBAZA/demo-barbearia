import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Scissors,
  Sparkles,
  ShieldCheck,
  Mail,
  Lock,
  User,
  ChevronRight,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTenant } from '@/contexts/TenantContext';
import { DEFAULT_LOGO } from '@/constants';
import barbershopHero from '@/assets/barbershop-hero.jpg';
import logoPng from '@/assets/logo.png';
import logoJpg from '@/assets/logoooo.jpg';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, resetPassword, user, loading: authLoading } = useAuth();
  const { tenant, loading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nome: '',
    cargo: 'cliente'
  });

  useEffect(() => {
    if (user && !authLoading && !tenantLoading) {
      if (tenant?.slug) {
        navigate(`/t/${tenant.slug}/dashboard`);
      } else {
        // Se já está logado e não tem slug (está na raiz), o RootRedirect no App.tsx cuidará disso
        navigate('/');
      }
    }
  }, [user, tenant, authLoading, tenantLoading, navigate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha email e senha', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await signIn(formData.email.trim(), formData.password.trim());
    if (error) {
      toast({ title: 'Erro de Autenticação', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.email || !formData.password) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await signUp(formData.email, formData.password, {
      nome: formData.nome,
      cargo: formData.cargo
    });
    if (error) {
      toast({ title: 'Erro ao criar conta', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Bem-vindo ao Club!', description: 'Sua conta VIP foi criada com sucesso.' });
      setActiveTab('signin');
    }
    setLoading(false);
  };

  const barbeariaLogo = (tenant?.logo_url && tenant.logo_url.length > 10) ? tenant.logo_url : (logoPng || logoJpg || DEFAULT_LOGO);
  const barbeariaHero = tenant?.banner_url || barbershopHero;
  const barbeariaNome = tenant?.nome || "Central Barber";

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-2 sm:p-4 relative overflow-hidden bg-[#05070a] selection:bg-primary/30">

      {/* Background Animado */}
      <div className="absolute inset-0 overflow-hidden -z-20">
        <div
          className="absolute inset-0 opacity-20 scale-110 blur-sm brightness-[0.3]"
          style={{
            backgroundImage: `url(${barbeariaHero})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#05070a] via-transparent to-[#05070a]/80" />
      </div>

      {/* Elementos Flutuantes */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.2, 0.1],
          rotate: [0, 180, 360],
          x: [-50, 50, -50]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-15%] right-[-15%] w-[70%] h-[70%] bg-primary/20 blur-[200px] rounded-full -z-10"
      />

      <div className="w-full max-w-7xl grid lg:grid-cols-2 gap-8 lg:gap-16 items-center relative z-10">

        {/* Branding Section - Desktop */}
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="hidden lg:flex flex-col space-y-8"
        >
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80">Premium Barbershop System</span>
            </div>
            <h1 className="text-6xl lg:text-8xl font-black text-white tracking-tighter leading-none uppercase">
              {barbeariaNome.split(' ')[0]} <span className="text-primary italic">{barbeariaNome.split(' ').slice(1).join(' ') || 'Barber'}</span>
            </h1>
          </div>

          <div className="space-y-6 max-w-lg">
            <h2 className="text-3xl lg:text-5xl font-bold text-white/90 leading-tight">
              Reinventando a <span className="text-white underline decoration-primary underline-offset-8">experiência</span> clássica.
            </h2>
            <p className="text-lg lg:text-xl text-muted-foreground/80 font-medium leading-relaxed">
              Gestão de elite para barbearias que buscam perfeição em cada detalhe.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 backdrop-blur-3xl">
              <Scissors className="h-6 w-6 text-primary mb-4" />
              <h4 className="font-black text-white uppercase text-[10px] tracking-widest mb-1">Cortes VIP</h4>
              <p className="text-xs text-muted-foreground/60">Padrão de excelência.</p>
            </div>
            <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 backdrop-blur-3xl">
              <Zap className="h-6 w-6 text-blue-400 mb-4" />
              <h4 className="font-black text-white uppercase text-[10px] tracking-widest mb-1">Queue Sync</h4>
              <p className="text-xs text-muted-foreground/60">Fila em tempo real.</p>
            </div>
          </div>
        </motion.div>

        {/* Auth Card Zone */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex justify-center w-full relative z-50 px-2 sm:px-0"
        >
          <div className="w-full max-w-[480px] bg-black/60 backdrop-blur-3xl border border-white/[0.08] rounded-[2.5rem] lg:rounded-[3rem] shadow-2xl p-6 lg:p-10 relative overflow-hidden">

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

            {/* Mobile Branding */}
            {/* Premium Mobile Branding */}
            <div className="lg:hidden flex flex-col items-center mb-12 text-center space-y-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group"
              >
                <div className="absolute -inset-4 bg-primary/20 rounded-[2.5rem] blur-2xl group-hover:bg-primary/30 transition-all duration-500" />
                <div className="relative w-28 h-28 rounded-[2.2rem] bg-gradient-to-br from-primary via-primary-glow to-amber-700 p-[2px] shadow-gold">
                  <div className="w-full h-full rounded-[2.1rem] bg-[#090b10] flex items-center justify-center overflow-hidden">
                    <img
                      src={barbeariaLogo}
                      alt={barbeariaNome}
                      className="w-full h-full object-contain p-2"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = DEFAULT_LOGO;
                      }}
                    />
                  </div>
                </div>
              </motion.div>

              <div className="space-y-2">
                <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
                  {barbeariaNome.split(' ')[0]} <span className="text-primary italic">{barbeariaNome.split(' ').slice(1).join(' ')}</span>
                </h1>
                <div className="h-1 w-16 bg-primary mx-auto rounded-full shadow-gold" />
                <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.3em] opacity-60">A Experiência Definitiva</p>
              </div>
            </div>

            <div className="w-full mb-8">
              <h3 className="text-2xl lg:text-4xl font-black text-white mb-2">
                {showResetPassword ? "Resgate" : activeTab === 'signin' ? "Acesso VIP" : "Cadastro VIP"}
              </h3>
              <p className="text-muted-foreground font-medium text-sm lg:text-base">
                {showResetPassword ? "Recupere o acesso ao seu club." : "Bem-vindo ao templo do estilo."}
              </p>
            </div>

            <div className="w-full relative z-20">
              <AnimatePresence mode="wait">
                {showResetPassword ? (
                  <motion.form
                    key="reset"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setLoading(true);
                      const { error } = await resetPassword(resetEmail);
                      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
                      else toast({ title: "Enviado", description: "Verifique seu email." });
                      setLoading(false);
                    }}
                    className="space-y-6"
                  >
                    <div className="space-y-3">
                      <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-2">Email</Label>
                      <Input
                        placeholder="seu@contato.com"
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="h-14 bg-white/5 border-white/10 rounded-[1.2rem] px-6"
                      />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-14 bg-gradient-gold text-black font-black rounded-[1.2rem] shadow-gold">
                      {loading ? <Loader2 className="animate-spin" /> : "Enviar Convite"}
                    </Button>
                    <button type="button" onClick={() => setShowResetPassword(false)} className="w-full text-sm font-bold text-muted-foreground">Voltar</button>
                  </motion.form>
                ) : (
                  <div className="space-y-6">
                    {/* CTA Barbeiro */}
                    <div className="p-[1px] rounded-[2rem] bg-gradient-to-r from-amber-500 to-amber-600">
                      <Button
                        onClick={() => navigate('/cadastro-barbearia')}
                        className="w-full h-16 bg-[#090b10] hover:bg-black/40 text-white rounded-[1.9rem] border-0 px-8 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <Scissors className="w-6 h-6 text-amber-500" />
                          <div className="text-left font-black uppercase text-sm">CRIAR MINHA BARBEARIA</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-amber-500" />
                      </Button>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="grid grid-cols-2 bg-white/[0.03] border border-white/10 p-1 rounded-[2rem] mb-6 h-14 backdrop-blur-md">
                        <TabsTrigger value="signin" className="rounded-[1.6rem] data-[state=active]:bg-gradient-gold data-[state=active]:text-black font-black text-xs uppercase tracking-widest transition-all">ENTRAR</TabsTrigger>
                        <TabsTrigger value="signup" className="rounded-[1.6rem] data-[state=active]:bg-gradient-gold data-[state=active]:text-black font-black text-xs uppercase tracking-widest transition-all">CADASTRO</TabsTrigger>
                      </TabsList>

                      <TabsContent value="signin" className="space-y-5">
                        <form onSubmit={handleSignIn} className="space-y-5">
                          <div className="space-y-2">
                            <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-2">Email VIP</Label>
                            <div className="relative">
                              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input
                                value={formData.email}
                                required
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                placeholder="seu@email.com"
                                type="email"
                                className="h-14 pl-14 bg-white/5 border-white/10 rounded-[1.2rem]"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center px-2">
                              <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground">Senha</Label>
                              <button type="button" onClick={() => setShowResetPassword(true)} className="text-[10px] font-black uppercase text-primary tracking-widest">Esqueci</button>
                            </div>
                            <div className="relative">
                              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input
                                value={formData.password}
                                required
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                placeholder="••••••••"
                                type="password"
                                className="h-14 pl-14 bg-white/5 border-white/10 rounded-[1.2rem]"
                              />
                            </div>
                          </div>
                          <Button type="submit" disabled={loading} className="w-full h-16 bg-gradient-gold text-black font-black text-lg rounded-[1.5rem] shadow-gold">
                            {loading ? <Loader2 className="animate-spin" /> : "Acessar o Templo"}
                          </Button>
                        </form>
                      </TabsContent>

                      <TabsContent value="signup" className="space-y-4">
                        <form onSubmit={handleSignUp} className="space-y-4">
                          <div className="space-y-2">
                            <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-2">Seu Nome</Label>
                            <div className="relative">
                              <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input
                                value={formData.nome}
                                required
                                onChange={(e) => handleInputChange('nome', e.target.value)}
                                placeholder="Como deseja ser chamado?"
                                className="h-14 pl-14 bg-white/5 border-white/10 rounded-[1.2rem]"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-2">Email</Label>
                            <Input
                              value={formData.email}
                              required
                              onChange={(e) => handleInputChange('email', e.target.value)}
                              placeholder="seu@contato.com"
                              type="email"
                              className="h-14 bg-white/5 border-white/10 rounded-[1.2rem] px-6"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-2">Senha</Label>
                            <Input
                              value={formData.password}
                              required
                              onChange={(e) => handleInputChange('password', e.target.value)}
                              placeholder="Mínimo 8 caracteres"
                              type="password"
                              className="h-14 bg-white/5 border-white/10 rounded-[1.2rem] px-6"
                            />
                          </div>
                          <Button type="submit" disabled={loading} className="w-full h-16 bg-primary text-black font-black text-lg rounded-[1.5rem] shadow-gold">
                            {loading ? <Loader2 className="animate-spin" /> : "Criar Conta VIP"}
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Secured */}
            <div className="mt-8 pt-8 border-t border-white/5">
              <div className="flex items-center justify-center gap-2 text-muted-foreground/30 text-[9px] font-black tracking-[0.4em] uppercase">
                <ShieldCheck className="h-4 w-4 text-emerald-500/30" /> Auth Secured by Supabase
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
