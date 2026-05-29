import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import logoPng from '@/assets/logo.png';

export interface Tenant {
    id: string;
    nome: string;
    slug: string;
    logo_url?: string;
    banner_url?: string;
    cor_primaria?: string;
    cor_secundaria?: string;
    whatsapp?: string;
    plano?: string;
    status?: 'active' | 'blocked';
    stripe_subscription_id?: string;
    subscription_status?: string;
    trial_ends_at?: string;
    max_employees?: number;
    fonte_primaria?: string;
}

interface TenantContextType {
    tenant: Tenant | null;
    loading: boolean;
    error: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const tenantLoadedRef = useRef(false);

    const hexToHsl = (hex: string): string => {
        hex = hex.replace(/^#/, '');
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    const applyTenant = (data: any) => {
        setTenant(data as Tenant);
        tenantLoadedRef.current = true;
        if (data.cor_primaria) {
            const hslValue = data.cor_primaria.startsWith('#') ? hexToHsl(data.cor_primaria) : data.cor_primaria;
            document.documentElement.style.setProperty('--primary', hslValue);
            document.documentElement.style.setProperty('--route66-gold', hslValue);
        }
        if (data.cor_secundaria) {
            const hslValue = data.cor_secundaria.startsWith('#') ? hexToHsl(data.cor_secundaria) : data.cor_secundaria;
            document.documentElement.style.setProperty('--secondary', hslValue);
        }
    };

    const location = useLocation();

    useEffect(() => {
        let isMounted = true;

        const resolveTenant = async () => {
            if (!isMounted) return;

            const path = window.location.pathname.toLowerCase();
            const safePaths = ['/auth', '/admin', '/reset-password', '/comercial', '/cadastro-barbearia'];

            if (safePaths.some(sp => path === sp || path.startsWith(sp + '/'))) {
                console.log('🛡️ Rota segura detectada:', path);
                setError(null);
                setLoading(false);
                return;
            }

            // Limpa erros anteriores antes de tentar resolver
            setError(null);
            setLoading(true);

            try {
                // 1. URL SLUG CHECK (Prioridade Máxima)
                const pathParts = window.location.pathname.split('/');
                let slugFromUrl = null;

                const firstPart = pathParts[1]?.toLowerCase().trim();
                const forbiddenParts = [
                    'auth', 'admin', 'reset-password', 'comercial',
                    'cadastro-barbearia', 'dashboard', 't', '',
                    'configuracoes', 'clientes', 'servicos', 'funcionarios',
                    'relatorios', 'comissoes', 'fila-espera', 'planos',
                    'qrcode', 'agendar', 'chegou', 'posicao-fila',
                    'agendamentos', 'perfil'
                ];

                if (pathParts[1] === 't' && pathParts[2]) {
                    slugFromUrl = pathParts[2].toLowerCase().trim();
                } else if (firstPart && !forbiddenParts.includes(firstPart)) {
                    slugFromUrl = firstPart;
                }

                if (slugFromUrl) {
                    console.log(`🌍 URL detectada (/t/${slugFromUrl}). Tentando resolver...`);

                    if (tenant?.slug === slugFromUrl) {
                        setLoading(false);
                        return;
                    }

                    const { data, error: fetchError } = await supabase
                        .from('tenants')
                        .select('*')
                        .eq('slug', slugFromUrl)
                        .maybeSingle();

                    if (fetchError) throw fetchError;

                    if (isMounted) {
                        if (data) {
                            console.log(`✅ Tenant Público carregado: ${data.nome}`);
                            applyTenant(data);
                            setLoading(false);
                        } else {
                            console.error(`❌ Tenant não encontrado para o slug: ${slugFromUrl}`);
                            // Tentativa final: Se falhou por slug mas o user está logado, 
                            // verificamos se o tenant ID do usuário bate com links antigos ou IDs
                            setError('Barbearia não encontrada.');
                            setLoading(false);
                        }
                    }
                    return;
                }

                // 2. AUTH CHECK (Apenas se NÃO houver slug na URL)
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    console.log('👤 Usuário logado detected no TenantContext:', user.email);

                    let candidateTenantId = user.user_metadata?.tenant_id;
                    let source = 'Metadata';

                    if (!candidateTenantId) {
                        const { data: role } = await supabase.from('user_roles').select('tenant_id').eq('user_id', user.id).maybeSingle();
                        if (role?.tenant_id) {
                            candidateTenantId = role.tenant_id;
                            source = 'UserRoles';
                        }
                    }

                    if (!candidateTenantId) {
                        const { data: func } = await supabase.from('funcionarios').select('tenant_id').eq('user_id', user.id).maybeSingle();
                        if (func?.tenant_id) {
                            candidateTenantId = func.tenant_id;
                            source = 'FuncionariosTable';
                        }
                    }

                    if (candidateTenantId) {
                        if (tenant?.id === candidateTenantId) {
                            setLoading(false);
                            return;
                        }

                        const { data: tenantData, error: idError } = await supabase
                            .from('tenants')
                            .select('*')
                            .eq('id', candidateTenantId)
                            .maybeSingle();

                        if (idError) {
                            console.error('Erro ao buscar tenant por ID:', idError);
                        }

                        if (tenantData && isMounted) {
                            console.log(`✅ Tenant encontrado (${source}): ${tenantData.nome}`);
                            applyTenant(tenantData);
                            setLoading(false);
                            return;
                        }
                    }

                    if (isMounted) {
                        setLoading(false);
                    }
                    return;
                }

                // 3. VISITANTE (Sem slug, sem auth)
                if (isMounted) {
                    setLoading(false);
                }

            } catch (err: any) {
                console.error('🔥 Erro ao resolver barbearia:', err);
                if (isMounted) {
                    setError(err.message || 'Erro ao sincronizar barbearia');
                    setLoading(false);
                }
            }
        };

        resolveTenant();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                resolveTenant();
            } else if (event === 'SIGNED_OUT') {
                setTenant(null);
                tenantLoadedRef.current = false;
                resolveTenant();
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [location.pathname, tenant?.id, tenant?.slug]); // Include variables affecting resolution

    // List of paths that allow access without a tenant
    const currentPath = window.location.pathname.toLowerCase();
    const isSafePath = ['/cadastro-barbearia', '/auth', '/reset-password', '/comercial'].some(path => currentPath.startsWith(path.toLowerCase()));

    console.log('🔍 Render Tenant Context:', { currentPath, isSafePath, hasError: !!error, hasTenant: !!tenant });

    return (
        <TenantContext.Provider value={{ tenant, loading, error }}>
            {loading ? (
                <div className="min-h-screen bg-[#05070a] flex flex-col items-center justify-center p-6 text-center space-y-8">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-primary via-primary-glow to-amber-700 p-1 animate-pulse shadow-gold group-hover:scale-110 transition-transform duration-500">
                            <div className="w-full h-full rounded-[2.3rem] bg-[#05070a] flex items-center justify-center overflow-hidden">
                                <img
                                    src={tenant?.logo_url || logoPng || "/logo.png"}
                                    alt="Logo"
                                    className="w-12 h-12 object-contain absolute group-hover:opacity-100 transition-opacity"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (target.src !== "/logo.png") {
                                            target.src = "/logo.png";
                                        }
                                    }}
                                />
                                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-white tracking-widest uppercase italic">Sincronizando</h2>
                        <p className="text-muted-foreground font-medium max-w-xs mx-auto animate-pulse">Estabelecendo conexão segura com o servidor...</p>
                    </div>
                </div>
            ) : (error && !isSafePath) ? (
                <div className="min-h-screen bg-[#05070a] flex flex-col items-center justify-center p-6 text-center space-y-10">
                    <div className="w-24 h-24 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full" />
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">ERRO NO SISTEMA</h1>
                        <p className="text-red-400 font-bold max-w-md mx-auto bg-red-500/5 p-6 rounded-[2rem] border border-red-500/10">
                            {error}
                        </p>
                    </div>
                    <div className="flex flex-col gap-4 w-full max-w-xs">
                        <button
                            onClick={() => window.location.reload()}
                            className="h-16 w-full bg-white text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-zinc-200 transition-all active:scale-95"
                        >
                            Tentar Novamente
                        </button>
                        <button
                            onClick={() => window.location.href = '/cadastro-barbearia'}
                            className="h-16 w-full bg-primary/10 text-primary border border-primary/20 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            Criar Minha Barbearia
                        </button>
                        <button
                            onClick={() => supabase.auth.signOut().then(() => window.location.href = '/auth')}
                            className="text-xs font-bold text-muted-foreground hover:text-white uppercase tracking-widest"
                        >
                            Sair da Conta
                        </button>
                    </div>
                </div>
            ) : (
                children
            )}
        </TenantContext.Provider>
    );
}

export function useTenant() {
    const context = useContext(TenantContext);
    if (context === undefined) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
}
