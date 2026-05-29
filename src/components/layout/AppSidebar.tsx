import {
  LayoutDashboard,
  Users,
  Scissors,
  Calendar,
  Route,
  UserCheck,
  BarChart3,
  Settings,
  LogOut,
  DollarSign,
  Sparkles,
  Clock,
  CreditCard,
  QrCode
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/contexts/TenantContext";
import { useConfiguracoes } from "@/hooks/useDatabase";
import { DEFAULT_LOGO } from "@/constants";
import logoPng from "@/assets/logo.png";

const baseMenuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Agendamentos", url: "/agendamentos", icon: Calendar },
];

const receptionistMenuItems = [
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Serviços", url: "/servicos", icon: Scissors },
  { title: "Fila de Espera", url: "/fila-espera", icon: Clock },
  { title: "Planos de Corte", url: "/planos", icon: CreditCard },
  { title: "QR Code Loja", url: "/qrcode", icon: QrCode },
];

const adminMenuItems = [
  { title: "Funcionários", url: "/funcionarios", icon: UserCheck },
  { title: "Comissões", url: "/comissoes", icon: DollarSign },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { funcionario, signOut, isCliente, user, userRole } = useAuth();
  const { tenant } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  // Centralização Senior: Redireciona para o seletor de planos
  const handleCheckout = () => {
    if (tenant?.slug) {
      navigate(`/t/${tenant.slug}/configuracoes?tab=assinatura`);
    } else {
      navigate('/configuracoes?tab=assinatura');
    }
  };

  const isCollapsed = state === "collapsed";

  const getMenuItems = () => {
    const slugPrefix = tenant?.slug ? `/t/${tenant.slug}` : '';

    // Function to transform URLs
    const transformUrl = (url: string) => {
      if (url === '/') return slugPrefix || '/';
      if (url.startsWith('/t/')) return url;
      return `${slugPrefix}${url}`;
    };

    if (isCliente) {
      return [
        { title: "Painel do Cliente", url: slugPrefix || "/", icon: LayoutDashboard },
        { title: "Agendar Novo", url: transformUrl("/agendar"), icon: Calendar },
        { title: "Meus Agendamentos", url: transformUrl("/agendamentos"), icon: Clock },
      ];
    }

    let items = [...baseMenuItems];

    if (userRole === 'admin' || userRole === 'gerente' || funcionario?.nivel_acesso === 'administrador') {
      items = [...items, ...receptionistMenuItems, ...adminMenuItems];
    } else if (funcionario?.nivel_acesso === 'recepcionista') {
      items = [...items, ...receptionistMenuItems];
    }

    // Apply transformation to all items
    return items.map(item => ({
      ...item,
      url: transformUrl(item.url)
    }));
  };

  const menuItems = getMenuItems();

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-primary text-black font-black translate-x-1 shadow-gold"
      : "text-muted-foreground hover:bg-white/5 hover:text-white";

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const roleLabel = funcionario?.cargo || (userRole === 'admin' ? 'Administrador' : userRole === 'gerente' ? 'Gerente' : userRole === 'recepcionista' ? 'Recepcionista' : 'Cliente');

  const { data: config } = useConfiguracoes();
  const barbeariaNome = config?.nome_barbearia || tenant?.nome || "BARBEARIA";

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-[#05070a] z-50 shadow-2xl transition-all duration-500">
      <SidebarHeader className="p-0">
        {/* Brand Identity com Suporte a White-label */}
        <div className="h-24 flex items-center px-6 border-b border-white/5 bg-black/20">
          <div className="flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center border border-primary/20 shadow-gold/10 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
              {tenant?.logo_url ? (
                <img src={tenant.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <img src={logoPng || DEFAULT_LOGO} alt="Logo" className="w-10 h-10 object-contain drop-shadow-gold transition-all" />
              )}
            </div>
            {!isCollapsed && (
              <div className="animate-in slide-in-from-left duration-500 max-w-[140px]">
                <h1 className="text-xl font-black tracking-tighter text-primary uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate">
                  {barbeariaNome}
                </h1>
                <p className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">
                  Estética Masculina
                </p>
              </div>
            )}
          </div>
        </div>

        {/* User Info */}
        {!isCollapsed && (funcionario || user) && (
          <div className="px-6 py-6 transition-all duration-500 border-b border-white/5">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center font-bold text-primary group-hover:scale-110 transition-transform">
                {(funcionario?.nome || user?.email || "?").substring(0, 1).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">
                  {funcionario?.nome || user?.email?.split('@')[0]}
                </p>
                <p className="text-[10px] font-bold text-primary/70 uppercase tracking-widest leading-none mt-1">
                  {roleLabel}
                </p>
              </div>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar">
        <SidebarGroup className="px-3 py-4">
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-4 mb-4">
            {!isCollapsed && "Navegação Geral"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-300 ${getNavClass(
                          { isActive }
                        )}`
                      }
                    >
                      <item.icon className={`w-5 h-5 shrink-0 ${currentPath === item.url || (item.url === '/' && currentPath === '/') ? 'animate-pulse text-primary' : ''}`} />
                      {!isCollapsed && (
                        <span className="font-medium tracking-tight">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-0 border-t border-white/5 bg-black/20">
        {!isCollapsed && tenant?.plano !== 'PROFISSIONAL' && (
          <div className="p-4 pb-0">
            <Button
              onClick={handleCheckout}
              className="w-full bg-gradient-to-r from-primary via-yellow-400 to-primary bg-[length:200%_auto] hover:bg-[position:right_center] transition-all duration-500 text-black font-black uppercase tracking-widest shadow-gold hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden"
            >
              <Sparkles className="w-4 h-4 mr-2 group-hover:animate-spin" />
              Seja Premium
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite] skew-x-12" />
            </Button>
          </div>
        )}
        {!isCollapsed && (
          <div className="p-4">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-sidebar-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              Sair da Conta
            </Button>
          </div>
        )}

        {isCollapsed && (
          <div className="p-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-full text-sidebar-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
              onClick={handleLogout}
              title="Sair da Conta"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        )}

        {!isCollapsed && (
          <div className="px-4 pb-4 text-center opacity-40">
            <div className="flex items-center justify-center gap-1 text-[8px] uppercase font-bold tracking-widest text-sidebar-foreground">
              <Route className="w-3 h-3 text-primary" />
              <span>Engine v2.5.0</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}