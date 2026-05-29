import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Layout } from "@/components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Servicos from "./pages/Servicos";
import Agendamentos from "./pages/Agendamentos";
import NotFound from "./pages/NotFound";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Funcionarios from "./pages/Funcionarios";
import Relatorios from "./pages/Relatorios";
import RelatoriosAvancados from "./pages/RelatoriosAvancados";
import Configuracoes from "./pages/Configuracoes";
import { AgendamentoPublico } from "./pages/AgendamentoPublico";
import { Comissoes } from "./pages/Comissoes";
import { ChatBot } from "@/components/ChatBot";
import ResetPassword from "./pages/ResetPassword";
import FilaEspera from "./pages/FilaEspera";
import Chegou from "./pages/Chegou";
import PosicaoFila from "./pages/PosicaoFila";
import PainelSenhas from "./pages/PainelSenhas";
import AdminPanel from "./pages/AdminPanel";
import ConfigPlanos from "./pages/ConfigPlanos";
import QRCodeGerador from "./pages/QRCodeGerador";

import { TenantProvider, useTenant } from "@/contexts/TenantContext";
import { useTheme } from "@/hooks/useTheme";
import "./styles/theme.css";

import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import NovoTenant from './pages/NovoTenant';
import LandingVendas from './pages/LandingVendas';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 segundos
      gcTime: 5 * 60 * 1000, // 5 minutos
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

const AppWrapper = ({ children }: { children: React.ReactNode }) => {
  useTheme();
  return <>{children}</>;
};

const RootRedirect = () => {
  const { user, loading: authLoading, isSuperAdmin, isCliente } = useAuth();
  const { tenant, loading: tenantLoading } = useTenant();
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Dá 1 segundo para resolver contextos lentos antes de assumir conta órfã
    const t = setTimeout(() => setIsReady(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Evita redirecionamentos enquanto estiver carregando os contextos principais
    if (authLoading || tenantLoading) return;

    if (!user) {
      if (isReady) navigate('/auth', { replace: true });
      return;
    }

    if (isSuperAdmin) {
      navigate('/admin', { replace: true });
      return;
    }

    if (tenant?.slug) {
      navigate(`/t/${tenant.slug}/dashboard`, { replace: true });
      return;
    }

    // Se o usuário está logado, NÃO é admin global, NÃO é cliente, não tem tenant e não está carregando,
    // ENTÃO nós o redirecionamos para a tela de criar barbearia (pois é uma conta órfã).
    if (!tenantLoading && !tenant?.slug && !isCliente) {
      if (!isReady) return; // Aguarda estabilizar para não pular precipitadamente
      console.warn("Usuário staff sem barbearia associada, redirecionando para cadastro...");
      navigate('/cadastro-barbearia', { replace: true });
    } else if (isCliente && !tenant?.slug) {
      // Se é cliente mas o tenant ainda não foi resolvido (ex: acabou de logar e não tem metadata)
      // podemos aguardar ou redirecionar para um dashboard genérico se existir, 
      // mas por ora deixamos ele no Root / DashboardCliente
      console.log("Cliente logado sem tenant resolvido.");
    }
  }, [user, tenant, authLoading, tenantLoading, navigate, isSuperAdmin, isReady, isCliente]);

  return (
    <div className="min-h-screen bg-[#05070a] flex flex-col items-center justify-center p-6 text-center space-y-8">
      <div className="relative group">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent p-[1px] shadow-gold/10">
          <div className="w-full h-full rounded-[14px] bg-[#05070a] flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain absolute opacity-40 shadow-gold" />
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        </div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 animate-pulse">Sincronizando Sistema</p>
    </div>
  );
};

const AppContent = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <BrowserRouter>
          <TenantProvider>
            <AppWrapper>
              <AuthProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <Routes>
                    {/* Super Admin Area */}
                    <Route path="/admin" element={
                      <ProtectedRoute>
                        <SuperAdminDashboard />
                      </ProtectedRoute>
                    } />

                    {/* Public routes */}
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/cadastro-barbearia" element={<NovoTenant />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/comercial" element={<LandingVendas />} />
                    <Route path="/t/:slug/agendar" element={<AgendamentoPublico />} />
                    <Route path="/t/:slug/chegou" element={<Chegou />} />
                    <Route path="/t/:slug/posicao-fila" element={<PosicaoFila />} />
                    <Route path="/t/:slug/painel-senhas" element={<PainelSenhas />} />
                    <Route path="/:slug/agendar" element={<AgendamentoPublico />} />
                    <Route path="/:slug/chegou" element={<Chegou />} />
                    <Route path="/:slug/posicao-fila" element={<PosicaoFila />} />
                    <Route path="/:slug/painel-senhas" element={<PainelSenhas />} />
                    <Route path="/:slug" element={<AgendamentoPublico />} />

                    {/* Application routes (with Layout) */}
                    <Route path="/t/:slug" element={
                      <ProtectedRoute>
                        <Layout>
                          <div className="flex-1 overflow-auto">
                            <Outlet />
                          </div>
                        </Layout>
                      </ProtectedRoute>
                    }>
                      <Route index element={<Dashboard />} />
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="clientes" element={<Clientes />} />
                      <Route path="servicos" element={<Servicos />} />
                      <Route path="agendamentos" element={<Agendamentos />} />
                      <Route path="fila-espera" element={<FilaEspera />} />
                      <Route path="comissoes" element={<Comissoes />} />
                      <Route path="qrcode" element={<QRCodeGerador />} />
                      <Route path="admin-panel" element={<AdminPanel />} />
                      <Route path="funcionarios" element={<Funcionarios />} />
                      <Route path="relatorios" element={<Relatorios />} />
                      <Route path="relatorios-avancados" element={<RelatoriosAvancados />} />
                      <Route path="configuracoes" element={<Configuracoes />} />
                      <Route path="planos" element={<ConfigPlanos />} />
                    </Route>

                    {/* Fallback direct routes (without slug) */}
                    <Route element={
                      <ProtectedRoute>
                        <Layout>
                          <div className="flex-1 overflow-auto">
                            <Outlet />
                          </div>
                        </Layout>
                      </ProtectedRoute>
                    }>
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="clientes" element={<Clientes />} />
                      <Route path="servicos" element={<Servicos />} />
                      <Route path="agendamentos" element={<Agendamentos />} />
                      <Route path="fila-espera" element={<FilaEspera />} />
                      <Route path="comissoes" element={<Comissoes />} />
                      <Route path="qrcode" element={<QRCodeGerador />} />
                      <Route path="admin-panel" element={<AdminPanel />} />
                      <Route path="funcionarios" element={<Funcionarios />} />
                      <Route path="relatorios" element={<Relatorios />} />
                      <Route path="relatorios-avancados" element={<RelatoriosAvancados />} />
                      <Route path="configuracoes" element={<Configuracoes />} />
                      <Route path="planos" element={<ConfigPlanos />} />
                    </Route>

                    {/* Fallback and Root Redirection */}
                    <Route path="/" element={<RootRedirect />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <ChatBot />
                </TooltipProvider>
              </AuthProvider>
            </AppWrapper>
          </TenantProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const App = () => <AppContent />;

export default App;