import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Menu, Home, User, Crown } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { NavigationButtons } from "./NavigationButtons";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { motion } from "framer-motion";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { ArrowRight } from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { funcionario, isCliente, isAdmin, isGerente, isRecepcionista, isFuncionario } = useAuth();
  const { isTrialExpired, trialEndsAt } = usePlanLimits();
  const { tenant } = useTenant();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (tenant?.slug) {
      navigate(`/t/${tenant.slug}/configuracoes?tab=assinatura`);
    } else {
      navigate('/configuracoes?tab=assinatura');
    }
  };

  const getCargo = () => {
    if (isCliente) return "Cliente VIP";
    if (isAdmin) return "Master Admin";
    if (isGerente) return "Gerente Regional";
    if (isRecepcionista) return "Reception Desk";
    if (isFuncionario && funcionario?.cargo === 'barbeiro') return "Master Barbeiro";
    return "Membro";
  };

  const getNome = () => funcionario?.nome || "Membro Central Barber";

  const getFoto = () => {
    if (funcionario?.foto_url) return funcionario.foto_url;
    return null;
  };

  const showUpgradeBanner = tenant?.plano !== 'PROFISSIONAL' && (isAdmin || isGerente);
  const remainingDays = trialEndsAt ? Math.ceil((new Date(trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;


  return (
    <SidebarProvider defaultOpen={true}>
      <div
        className="min-h-screen flex w-full bg-[#05070a] relative overflow-hidden selection:bg-primary/30"
      >
        {/* Banner de Upgrade Universal (Senior Developer Fix) */}
        {showUpgradeBanner && (
          <div className={`fixed top-0 left-0 right-0 z-[100] h-11 flex items-center justify-center px-4 transition-all ${isTrialExpired ? 'bg-rose-600 shadow-[0_4px_20px_rgba(225,29,72,0.4)]' : 'bg-primary shadow-gold'} text-black font-black text-[10px] md:text-xs overflow-hidden`}>
            <div className="absolute inset-0 bg-white/10 animate-[shimmer_2s_infinite] skew-x-12 translate-x-[-100%]" />
            <div className="flex items-center gap-4 relative z-10">
              <Crown className="w-4 h-4" />
              <span className="uppercase tracking-[0.2em]">
                {isTrialExpired
                  ? "Atenção: Seu período de teste expirou. Migre para o plano Profissional."
                  : `MODO TESTE: VOCÊ TEM +${remainingDays} DIAS DE ACESSO PREMIUM`}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCheckout}
                className="bg-black text-white hover:bg-black/80 flex items-center gap-2 font-black uppercase text-[10px] px-6 h-8 rounded-full transition-all hover:scale-105 active:scale-95 border-none shadow-lg"
              >
                DESBLOQUEAR TUDO AGORA
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Advanced Mesh Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[160px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[140px]" />
          <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[120px]" />
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)`, backgroundSize: '40px 40px' }}
          />
        </div>

        <AppSidebar />

        <div className={`flex-1 flex flex-col relative z-20 w-full min-w-0 transition-all duration-500 h-full overflow-hidden ${showUpgradeBanner ? 'mt-11' : ''}`}>
          {/* Futuristic Floating Header */}
          <header className={`h-20 border-b border-white/[0.03] bg-black/60 backdrop-blur-3xl sticky ${showUpgradeBanner ? 'top-11' : 'top-0'} z-40 px-4 md:px-8 shrink-0 flex items-center justify-between`}>
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <div className="flex items-center justify-between h-full w-full">
              <div className="flex items-center gap-2 md:gap-6">
                <SidebarTrigger className="h-11 w-11 hover:bg-white/5 rounded-2xl transition-all hover:scale-105 active:scale-95 border border-white/5 group">
                  <Menu className="w-5 h-5 text-primary group-hover:rotate-180 transition-transform duration-500" />
                </SidebarTrigger>

                <div className="hidden sm:flex items-center gap-3">
                  <NavigationButtons />
                  <div className="h-4 w-[1px] bg-white/10 mx-2" />
                  <Button asChild variant="ghost" size="sm" className="rounded-xl hover:bg-white/5 text-muted-foreground hover:text-white transition-all px-4">
                    <NavLink to="/" className="flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      <span className="font-bold text-xs uppercase tracking-widest">Início</span>
                    </NavLink>
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Notifications & Global Actions */}
                <div className="hidden md:flex items-center gap-2">
                  <NotificationCenter />
                </div>

                {/* Profile Widget */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 pl-4 border-l border-white/10"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] leading-none mb-1">{getCargo()}</p>
                    <p className="text-sm font-bold text-white leading-none truncate max-w-[150px]">{getNome()}</p>
                  </div>
                  <div className="relative group cursor-pointer">
                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-[1px] group-hover:scale-105 transition-transform">
                      <div className="w-full h-full rounded-[14px] bg-[#05070a] overflow-hidden flex items-center justify-center border border-white/5">
                        {getFoto() ? (
                          <img src={getFoto()!} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-primary/40" />
                        )}
                      </div>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#05070a] rounded-full" />
                  </div>
                </motion.div>
              </div>
            </div>
          </header>

          {/* Page Container with smooth transitions */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-7xl mx-auto w-full p-4 md:p-8 min-h-full"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
