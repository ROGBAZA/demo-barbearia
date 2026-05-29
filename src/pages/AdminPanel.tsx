import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Shield,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Users,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface Funcionario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  nivel_acesso: 'funcionario' | 'administrador' | 'recepcionista';
  ativo: boolean;
  user_id?: string | null;
  tipo_comissao?: 'percentual' | 'valor_fixo';
  valor_comissao?: number;
  created_at?: string;
}

export default function AdminPanel() {
  const { isAdmin, isGerente, user } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedFuncionario, setSelectedFuncionario] = useState<Funcionario | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    confirmPassword: '',
    cargo: 'barbeiro',
    nivel_acesso: 'funcionario' as 'funcionario' | 'administrador' | 'recepcionista',
    tipo_comissao: 'percentual' as 'percentual' | 'valor_fixo',
    valor_comissao: 10,
    ativo: true
  });

  // Fetch funcionários
  const { data: funcionarios, isLoading } = useQuery({
    queryKey: ['funcionarios-admin', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching employees:', error);
        if (error.message.includes('tenant_id')) {
          toast({
            title: "Migração Necessária",
            description: "A coluna 'tenant_id' não foi encontrada. Rode o script SQL enviado.",
            variant: "destructive"
          });
        }
        return [];
      }
      return data as Funcionario[];
    },
    enabled: (isAdmin || isGerente) && !!tenant?.id,
  });

  // Fetch audit logs
  const { data: auditLogs } = useQuery({
    queryKey: ['audit-logs', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin && !!tenant?.id,
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      password: '',
      confirmPassword: '',
      cargo: 'barbeiro',
      nivel_acesso: 'funcionario',
      tipo_comissao: 'percentual',
      valor_comissao: 10,
      ativo: true
    });
  };

  const handleCreateFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar senhas
      if (formData.password.length < 8) {
        throw new Error('A senha deve ter pelo menos 8 caracteres');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('As senhas não coincidem');
      }

      // Criar usuário via Edge Function (mais seguro e evita 403 no frontend)
      const { data: authData, error: authError } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          nome: formData.nome,
          cargo: formData.cargo,
          nivel_acesso: formData.nivel_acesso
        }
      });

      if (authError) throw authError;
      if (authData?.error) throw new Error(authData.error);

      // O registro na tabela 'funcionarios' já deve ter sido feito pela Edge Function ou pelo trigger,
      // mas para garantir consistência com o código original que faz o insert manual logo após,
      // vamos verificar se precisamos fazer o insert aqui ou se já está pronto.
      // Geralmente, a Edge Function 'admin-create-user' costuma fazer o insert se estiver configurada assim.
      // Se a Edge Function apenas cria o auth user, o insert abaixo complementa:

      const actualUserId = authData.user?.id || authData.id;
      if (!actualUserId) throw new Error('Não foi possível obter o ID do novo usuário');

      // Criar registro na tabela funcionarios (Upsert para evitar duplicidade se a Function já criou)
      const { error: funcError } = await supabase
        .from('funcionarios')
        .upsert({
          nome: formData.nome,
          email: formData.email,
          cargo: formData.cargo,
          nivel_acesso: formData.nivel_acesso,
          tipo_comissao: formData.tipo_comissao,
          valor_comissao: formData.valor_comissao,
          ativo: formData.ativo,
          user_id: actualUserId,
          tenant_id: tenant.id
        }, { onConflict: 'email' });

      if (funcError) throw funcError;

      // Log de auditoria
      await supabase
        .from('audit_logs')
        .insert({
          action: 'CREATE_FUNCIONARIO',
          target_user_id: authData.user.id,
          details: {
            nome: formData.nome,
            email: formData.email,
            cargo: formData.cargo,
            nivel_acesso: formData.nivel_acesso
          }
        });

      toast({
        title: '✅ Funcionário criado com sucesso',
        description: `${formData.nome} foi adicionado ao sistema com o email ${formData.email}.`,
      });

      // Mostrar senha temporariamente para o admin
      if (formData.password) {
        toast({
          title: '🔑 Senha do Funcionário',
          description: `Anote a senha: ${formData.password}`,
          duration: 10000,
        });
      }

      setShowCreateDialog(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['funcionarios-admin'] });
    } catch (error: any) {
      console.error('Erro ao criar funcionário:', error);
      toast({
        title: '❌ Erro ao criar funcionário',
        description: error.message || 'Ocorreu um erro ao tentar criar o funcionário.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFuncionario) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('funcionarios')
        .update({
          nome: formData.nome,
          cargo: formData.cargo,
          nivel_acesso: formData.nivel_acesso,
          tipo_comissao: formData.tipo_comissao,
          valor_comissao: formData.valor_comissao,
          ativo: formData.ativo
        })
        .eq('id', selectedFuncionario.id)
        .eq('tenant_id', tenant?.id);

      if (error) throw error;

      // Log de auditoria
      await supabase
        .from('audit_logs')
        .insert({
          action: 'UPDATE_FUNCIONARIO',
          target_user_id: selectedFuncionario.user_id,
          details: {
            old_data: selectedFuncionario,
            new_data: formData
          }
        });

      toast({
        title: '✅ Funcionário atualizado',
        description: `Os dados de ${formData.nome} foram atualizados.`,
      });

      setShowEditDialog(false);
      setSelectedFuncionario(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['funcionarios-admin'] });
    } catch (error: any) {
      console.error('Erro ao atualizar funcionário:', error);
      toast({
        title: '❌ Erro ao atualizar',
        description: error.message || 'Ocorreu um erro ao tentar atualizar o funcionário.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFuncionario = async (funcionario: Funcionario) => {
    if (!confirm(`Tem certeza que deseja desativar o funcionário ${funcionario.nome}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('funcionarios')
        .update({ ativo: false })
        .eq('id', funcionario.id);

      if (error) throw error;

      // Log de auditoria
      await supabase
        .from('audit_logs')
        .insert({
          action: 'DEACTIVATE_FUNCIONARIO',
          target_user_id: funcionario.user_id,
          details: {
            nome: funcionario.nome,
            email: funcionario.email
          }
        });

      toast({
        title: '✅ Funcionário desativado',
        description: `${funcionario.nome} foi desativado com sucesso.`,
      });

      queryClient.invalidateQueries({ queryKey: ['funcionarios-admin'] });
    } catch (error: any) {
      console.error('Erro ao desativar funcionário:', error);
      toast({
        title: '❌ Erro ao desativar',
        description: error.message || 'Ocorreu um erro ao tentar desativar o funcionário.',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (funcionario: Funcionario) => {
    setSelectedFuncionario(funcionario);
    setFormData({
      nome: funcionario.nome,
      email: funcionario.email,
      password: '',
      cargo: funcionario.cargo,
      nivel_acesso: funcionario.nivel_acesso,
      tipo_comissao: funcionario.tipo_comissao || 'percentual',
      valor_comissao: funcionario.valor_comissao || 10,
      ativo: funcionario.ativo
    });
    setShowEditDialog(true);
  };

  const getNivelAcessoBadge = (nivel: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      administrador: { label: 'Administrador', variant: 'destructive' },
      gerente: { label: 'Gerente', variant: 'default' },
      recepcionista: { label: 'Recepcionista', variant: 'secondary' },
      funcionario: { label: 'Funcionário', variant: 'secondary' }
    };

    const config = variants[nivel] || { label: nivel, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (!isAdmin && !isGerente) {
    return (
      <ProtectedRoute requiredRole="admin">
        <div className="container mx-auto py-8">
          <div className="text-center">
            <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">Você não tem permissão para acessar esta área.</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Painel Administrativo
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie funcionários e monitore atividades do sistema
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Novo Funcionário
          </Button>
        </div>

        {/* Security Alert */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Aviso de Segurança
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-700 text-sm">
              Este painel permite gerenciar contas de funcionários com acesso ao sistema.
              Apenas usuários autorizados devem ter acesso a esta área.
              Todas as ações são registradas para auditoria.
            </p>
          </CardContent>
        </Card>

        {/* Funcionários Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Funcionários ({funcionarios?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Nível de Acesso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {funcionarios?.map((funcionario) => (
                    <TableRow key={funcionario.id}>
                      <TableCell className="font-medium">{funcionario.nome}</TableCell>
                      <TableCell>{funcionario.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {funcionario.cargo}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getNivelAcessoBadge(funcionario.nivel_acesso)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={funcionario.ativo ? 'default' : 'secondary'}>
                          {funcionario.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(funcionario)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {funcionario.ativo && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteFuncionario(funcionario)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Audit Logs - Admin Only */}
        {isAdmin && auditLogs && (
          <Card>
            <CardHeader>
              <CardTitle>Logs de Auditoria</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.slice(0, 10).map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-w-md">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Funcionário</DialogTitle>
              <DialogDescription>
                Crie uma nova conta de funcionário para o sistema
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateFuncionario} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                    minLength={8}
                    placeholder="Confirme a senha"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo</Label>
                <Select value={formData.cargo} onValueChange={(value) => handleInputChange('cargo', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="barbeiro">Barbeiro</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="recepcionista">Recepcionista</SelectItem>
                    <SelectItem value="auxiliar">Auxiliar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nivel_acesso">Nível de Acesso</Label>
                <Select
                  value={formData.nivel_acesso}
                  onValueChange={(value: any) => handleInputChange('nivel_acesso', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="funcionario">Funcionário</SelectItem>
                    <SelectItem value="recepcionista">Recepcionista</SelectItem>
                    {isAdmin && <SelectItem value="administrador">Administrador</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Criando...' : 'Criar Funcionário'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Funcionário</DialogTitle>
              <DialogDescription>
                Atualize os dados do funcionário
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateFuncionario} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nome">Nome Completo</Label>
                <Input
                  id="edit-nome"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cargo">Cargo</Label>
                <Select value={formData.cargo} onValueChange={(value) => handleInputChange('cargo', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="barbeiro">Barbeiro</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="recepcionista">Recepcionista</SelectItem>
                    <SelectItem value="auxiliar">Auxiliar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-nivel_acesso">Nível de Acesso</Label>
                <Select
                  value={formData.nivel_acesso}
                  onValueChange={(value: any) => handleInputChange('nivel_acesso', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="funcionario">Funcionário</SelectItem>
                    <SelectItem value="recepcionista">Recepcionista</SelectItem>
                    {isAdmin && <SelectItem value="administrador">Administrador</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ativo">Status</Label>
                <Select
                  value={formData.ativo ? 'true' : 'false'}
                  onValueChange={(value) => handleInputChange('ativo', value === 'true')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    setSelectedFuncionario(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Atualizando...' : 'Atualizar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
