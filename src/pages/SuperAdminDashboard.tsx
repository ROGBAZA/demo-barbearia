import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Building2,
    Users,
    Calendar,
    DollarSign,
    TrendingUp,
    Activity,
    Shield,
    AlertCircle,
    CheckCircle,
    XCircle,
    Clock,
    Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface TenantData {
    tenant_id: string;
    barbearia: string;
    slug: string;
    plano: string;
    subscription_status: string;
    trial_ends_at: string;
    ativo: boolean;
    data_cadastro: string;
    limite_funcionarios: number;
    funcionarios_ativos: number;
    total_clientes: number;
    total_servicos: number;
    total_agendamentos: number;
    agendamentos_concluidos: number;
    receita_total: number;
    owner_email: string;
    admin_principal: string;
}

interface Stats {
    total_tenants: number;
    total_tenants_trial: number;
    total_tenants_active: number;
    total_tenants_canceled: number;
    total_funcionarios: number;
    total_clientes: number;
    total_agendamentos: number;
    receita_total: number;
}

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const [tenants, setTenants] = useState<TenantData[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    useEffect(() => {
        checkSuperAdmin();
    }, []);

    const checkSuperAdmin = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/auth');
                return;
            }

            // Verificar se é super admin
            const { data: superAdmin } = await supabase
                .from('super_admins')
                .select('*')
                .eq('user_id', user.id)
                .eq('ativo', true)
                .maybeSingle();

            if (!superAdmin) {
                toast({
                    title: 'Acesso Negado',
                    description: 'Você não tem permissão para acessar esta área.',
                    variant: 'destructive'
                });
                navigate('/');
                return;
            }

            setIsSuperAdmin(true);
            loadData();
        } catch (error: any) {
            console.error('Erro ao verificar super admin:', error);
            navigate('/');
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);

            // Carregar estatísticas
            const { data: statsData, error: statsError } = await supabase.rpc('get_super_admin_stats');
            if (statsError) throw statsError;
            setStats(statsData);

            // Carregar lista de tenants
            const { data: tenantsData, error: tenantsError } = await supabase
                .from('tenants')
                .select(`
          id,
          nome,
          slug,
          plano,
          subscription_status,
          trial_ends_at,
          ativo,
          created_at,
          max_employees,
          owner_id
        `)
                .order('created_at', { ascending: false });

            if (tenantsError) throw tenantsError;

            // Enriquecer dados com estatísticas de cada tenant
            const enrichedTenants = await Promise.all(
                (tenantsData || []).map(async (tenant) => {
                    const [funcionarios, clientes, servicos, agendamentos, agendamentosCompletos, receita] = await Promise.all([
                        supabase.from('funcionarios').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('ativo', true),
                        supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
                        supabase.from('servicos').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
                        supabase.from('agendamentos').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
                        supabase.from('agendamentos').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'concluido'),
                        supabase.from('agendamentos').select('servicos(preco)').eq('tenant_id', tenant.id).eq('status', 'concluido')
                    ]);

                    const receitaTotal = (receita.data || []).reduce((sum, item: any) => sum + (item.servicos?.preco || 0), 0);

                    return {
                        tenant_id: tenant.id,
                        barbearia: tenant.nome,
                        slug: tenant.slug,
                        plano: tenant.plano || 'free',
                        subscription_status: tenant.subscription_status || 'trialing',
                        trial_ends_at: tenant.trial_ends_at,
                        ativo: tenant.ativo,
                        data_cadastro: tenant.created_at,
                        limite_funcionarios: tenant.max_employees || 3,
                        funcionarios_ativos: funcionarios.count || 0,
                        total_clientes: clientes.count || 0,
                        total_servicos: servicos.count || 0,
                        total_agendamentos: agendamentos.count || 0,
                        agendamentos_concluidos: agendamentosCompletos.count || 0,
                        receita_total: receitaTotal,
                        owner_email: '',
                        admin_principal: ''
                    };
                })
            );

            setTenants(enrichedTenants);
        } catch (error: any) {
            console.error('Erro ao carregar dados:', error);
            toast({
                title: 'Erro',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
            active: { label: 'Ativo', variant: 'default' },
            trialing: { label: 'Trial', variant: 'secondary' },
            canceled: { label: 'Cancelado', variant: 'destructive' },
            past_due: { label: 'Atrasado', variant: 'destructive' }
        };

        const config = statusMap[status] || { label: status, variant: 'outline' };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('pt-BR');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Shield className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
                    <p className="text-lg text-muted-foreground">Carregando painel de Super Admin...</p>
                </div>
            </div>
        );
    }

    if (!isSuperAdmin) {
        return null;
    }

    return (
        <div className="space-y-8 p-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-white flex items-center gap-3">
                        <Shield className="h-10 w-10 text-primary" />
                        Super Admin Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-2">Visão geral de todas as barbearias do sistema</p>
                </div>
                <Button onClick={loadData} variant="outline">
                    <Activity className="h-4 w-4 mr-2" />
                    Atualizar
                </Button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total de Barbearias</CardTitle>
                            <Building2 className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats.total_tenants}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stats.total_tenants_active} ativas • {stats.total_tenants_trial} em trial
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
                            <Users className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats.total_clientes}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stats.total_funcionarios} funcionários ativos
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
                            <Calendar className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats.total_agendamentos}</div>
                            <p className="text-xs text-muted-foreground mt-1">Todos os tempos</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                            <DollarSign className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{formatCurrency(stats.receita_total)}</div>
                            <p className="text-xs text-muted-foreground mt-1">Agendamentos concluídos</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tenants Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Barbearias Cadastradas</CardTitle>
                    <CardDescription>Lista completa de todas as barbearias no sistema</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Barbearia</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Plano</TableHead>
                                    <TableHead className="text-right">Funcionários</TableHead>
                                    <TableHead className="text-right">Clientes</TableHead>
                                    <TableHead className="text-right">Agendamentos</TableHead>
                                    <TableHead className="text-right">Receita</TableHead>
                                    <TableHead>Cadastro</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tenants.map((tenant) => (
                                    <TableRow key={tenant.tenant_id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{tenant.barbearia}</div>
                                                <div className="text-sm text-muted-foreground">/t/{tenant.slug}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(tenant.subscription_status)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{tenant.plano}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {tenant.funcionarios_ativos}/{tenant.limite_funcionarios}
                                        </TableCell>
                                        <TableCell className="text-right">{tenant.total_clientes}</TableCell>
                                        <TableCell className="text-right">
                                            {tenant.agendamentos_concluidos}/{tenant.total_agendamentos}
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(tenant.receita_total)}</TableCell>
                                        <TableCell>{formatDate(tenant.data_cadastro)}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.open(`/t/${tenant.slug}`, '_blank')}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
