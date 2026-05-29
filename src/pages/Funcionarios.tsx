import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Shield,
  UserCheck,
  Eye,
  EyeOff,
  Loader2,
  Search,
  XCircle,
  Sparkles,
  Zap,
  Mail,
  Phone,
  Briefcase,
  ShieldCheck,
  Star,
  Crown,
  Scissors,
  CheckCircle
} from 'lucide-react';
import { useFuncionarios, useCreateFuncionario, useUpdateFuncionario, useDeleteFuncionario } from '@/hooks/useDatabase';
import { motion, AnimatePresence } from 'framer-motion';
import { CardContainer, CardBody, CardItem } from '@/components/ui/card-3d';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageUpload } from '@/components/ImageUpload';
import { cn } from '@/lib/utils';

interface FuncionarioForm {
  nome: string;
  telefone: string;
  email: string;
  password: string;
  confirmPassword: string;
  cargo: 'barbeiro' | 'recepcao' | 'auxiliar' | 'gerente';
  nivel_acesso: 'funcionario' | 'administrador';
  tipo_comissao: 'percentual' | 'valor_fixo';
  valor_comissao: string;
  foto_url: string;
  horario_inicio: string;
  horario_fim: string;
  dias_trabalho: number[];
}

const diasSemana = [
  { id: 1, nome: 'Seg' },
  { id: 2, nome: 'Ter' },
  { id: 3, nome: 'Qua' },
  { id: 4, nome: 'Qui' },
  { id: 5, nome: 'Sex' },
  { id: 6, nome: 'Sáb' },
  { id: 0, nome: 'Dom' },
];

import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useTenant } from '@/contexts/TenantContext';

export default function Funcionarios() {
  const { tenant } = useTenant();
  const { toast } = useToast();
  const { checkEmployeeLimit, planName } = usePlanLimits();
  const limitInfo = checkEmployeeLimit();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<FuncionarioForm>({
    nome: '',
    telefone: '',
    email: '',
    password: '',
    confirmPassword: '',
    cargo: 'barbeiro',
    nivel_acesso: 'funcionario',
    tipo_comissao: 'percentual',
    valor_comissao: '0',
    foto_url: '',
    horario_inicio: '',
    horario_fim: '',
    dias_trabalho: []
  });

  const { data: funcionarios = [], isLoading } = useFuncionarios();
  const createFuncionario = useCreateFuncionario();
  const updateFuncionario = useUpdateFuncionario();
  const deleteFuncionario = useDeleteFuncionario();

  const resetForm = () => {
    setFormData({
      nome: '',
      telefone: '',
      email: '',
      password: '',
      confirmPassword: '',
      cargo: 'barbeiro',
      nivel_acesso: 'funcionario',
      tipo_comissao: 'percentual',
      valor_comissao: '0',
      foto_url: '',
      horario_inicio: '',
      horario_fim: '',
      dias_trabalho: []
    });
    setImageError(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingId) {
      if (limitInfo.reached && formData.cargo === 'barbeiro') {
        toast({
          title: "Limite de Barbeiros Atingido",
          description: `Seu plano ${planName} permite apenas ${limitInfo.max} barbeiros. Gerentes e recepcionistas são ilimitados. Faça o upgrade para adicionar mais barbeiros.`,
          variant: "destructive"
        });
        return;
      }

      if (!formData.password || formData.password.length < 8) {
        toast({ title: 'Senha inválida', description: 'Mínimo 8 caracteres', variant: 'destructive' });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast({ title: 'Senhas divergentes', description: 'As senhas não coincidem', variant: 'destructive' });
        return;
      }
    } else {
      // Validation for password update in edit mode
      if (formData.password && formData.password.length < 8) {
        toast({ title: 'Senha inválida', description: 'Mínimo 8 caracteres', variant: 'destructive' });
        return;
      }
      if (formData.password && formData.password !== formData.confirmPassword) {
        toast({ title: 'Senhas divergentes', description: 'As senhas não coincidem', variant: 'destructive' });
        return;
      }
    }

    const { password, confirmPassword, ...rest } = formData;
    let funcionarioData: any = { ...rest, valor_comissao: parseFloat(rest.valor_comissao) };

    // Only include password if it's being updated (non-empty) or if it's a new user
    if (password || !editingId) {
      funcionarioData.password = password;
    }

    try {
      if (editingId) {
        await updateFuncionario.mutateAsync({ id: editingId, ...funcionarioData });
      } else {
        await createFuncionario.mutateAsync({ ...funcionarioData, password, ativo: true });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      // O erro já é tratado pelo hook, mas mantemos o catch para evitar crash
      console.error('Erro na submissão:', error);
    }
  };

  const handleEdit = (funcionario: any) => {
    setFormData({
      nome: funcionario.nome,
      telefone: funcionario.telefone || '',
      email: funcionario.email,
      cargo: funcionario.cargo,
      nivel_acesso: funcionario.nivel_acesso,
      tipo_comissao: funcionario.tipo_comissao,
      valor_comissao: funcionario.valor_comissao.toString(),
      foto_url: funcionario.foto_url || '',
      horario_inicio: funcionario.horario_inicio || '',
      horario_fim: funcionario.horario_fim || '',
      dias_trabalho: funcionario.dias_trabalho || [],
      password: '',
      confirmPassword: ''
    });
    setEditingId(funcionario.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFuncionario.mutateAsync(id);
      toast({ title: 'Membro Removido', description: 'O funcionário foi desligado do sistema.' });
    } catch (error: any) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    }
  };

  const getCargoIcon = (cargo: string) => {
    switch (cargo) {
      case 'barbeiro': return <Scissors className="w-4 h-4" />;
      case 'recepcao': return <UserCheck className="w-4 h-4" />;
      case 'gerente': return <ShieldCheck className="w-4 h-4" />;
      case 'auxiliar': return <Users className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const filteredFuncionarios = funcionarios.filter(f =>
    f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-8 p-6">
        <div className="flex justify-between items-end">
          <Skeleton className="h-10 w-48 bg-white/5" />
          <Skeleton className="h-12 w-40 bg-white/5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-[2.5rem] bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <section className="relative p-8 md:p-12 rounded-[3rem] bg-black/40 border border-white/5 overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-80 h-80 bg-primary/10 blur-[120px] -z-10" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-red-500/5 blur-[150px] -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-lg group">
                <Users className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">Equipe</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/20 tracking-widest text-[10px] uppercase font-black">
                    Elite Force
                  </Badge>
                </div>
              </div>
            </div>
            <p className="text-lg text-muted-foreground font-medium max-w-xl">Gerencie os talentos que transformam a <span className="text-white font-black italic">{tenant?.nome || 'sua barbearia'}</span> no templo da estética masculina.</p>
          </motion.div>

          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()} className="h-16 px-10 bg-gradient-gold text-black font-black text-lg rounded-[1.5rem] shadow-gold border-0 gap-3 group">
                  <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
                  Novo Integrante
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-white/10 text-white backdrop-blur-3xl p-0 rounded-[2.5rem] custom-scrollbar">
                <div className="p-8 pb-4">
                  <DialogHeader>
                    <DialogTitle className="text-3xl font-black flex items-center gap-3">
                      <UserCheck className="h-8 w-8 text-primary" />
                      {editingId ? 'Refinar Perfil' : 'Cadastrar Membro'}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">Configure as credenciais e acessos da equipe.</DialogDescription>
                  </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="px-8 py-6 bg-white/[0.02] border-y border-white/5 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-1">Nome Artístico/Real</Label>
                      <Input
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Ex: Marcus Barbeiro"
                        className="h-14 bg-black border-white/10 rounded-2xl px-6"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-1">Telefone Interno</Label>
                      <Input
                        value={formData.telefone}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                        placeholder="(99) 99999-9999"
                        className="h-14 bg-black border-white/10 rounded-2xl px-6"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-1">Email Profissional (Login)</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder={`email@${tenant?.slug || 'sistema'}.com`}
                      className="h-14 bg-black border-white/10 rounded-2xl px-6"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-1">
                        {editingId ? "Redefinir Senha (Opcional)" : "Senha de Acesso"}
                      </Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder={editingId ? "Deixe em branco para manter" : "••••••••"}
                          className="h-14 bg-black border-white/10 rounded-2xl px-6 pr-12"
                          required={!editingId}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-1">Confirmar Senha</Label>
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="••••••••"
                        className="h-14 bg-black border-white/10 rounded-2xl px-6"
                        required={!editingId || formData.password.length > 0}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-1">Especialidade / Cargo</Label>
                      <Select value={formData.cargo} onValueChange={(v: any) => setFormData({ ...formData, cargo: v })}>
                        <SelectTrigger className="h-14 bg-black border-white/10 rounded-2xl px-6"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                          <SelectItem value="barbeiro">Barbeiro Master</SelectItem>
                          <SelectItem value="recepcao">Front Desk / Recepção</SelectItem>
                          <SelectItem value="gerente">Gerente Geral</SelectItem>
                          <SelectItem value="auxiliar">Auxiliar de Estilo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-1">Nível Hierárquico</Label>
                      <Select value={formData.nivel_acesso} onValueChange={(v: any) => setFormData({ ...formData, nivel_acesso: v })}>
                        <SelectTrigger className="h-14 bg-black border-white/10 rounded-2xl px-6"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                          <SelectItem value="funcionario">Staff Operacional</SelectItem>
                          <SelectItem value="administrador">Admin Power</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <ImageUpload
                      label="Avatar Profissional"
                      currentImage={formData.foto_url}
                      onImageUploaded={(url) => setFormData(prev => ({ ...prev, foto_url: url }))}
                      bucket="avatars"
                      folder="funcionarios"
                      aspectRatio="1/1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-1">Modelo de Comissão</Label>
                      <Select value={formData.tipo_comissao} onValueChange={(v: any) => setFormData({ ...formData, tipo_comissao: v })}>
                        <SelectTrigger className="h-14 bg-black border-white/10 rounded-2xl px-6"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                          <SelectItem value="percentual">Percentual (%)</SelectItem>
                          <SelectItem value="valor_fixo">Montante Fixo (R$)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-1">Valor Vigente</Label>
                      <Input
                        type="number"
                        value={formData.valor_comissao}
                        onChange={(e) => setFormData({ ...formData, valor_comissao: e.target.value })}
                        className="h-14 bg-black border-white/10 rounded-2xl px-6"
                      />
                    </div>
                  </div>

                  {/* Horários e Dias de Trabalho */}
                  <div className="space-y-6 pt-4 border-t border-white/5">
                    <Label className="uppercase text-[10px] tracking-widest font-black text-primary ml-1">Horário Individual (Opcional)</Label>
                    <p className="text-[10px] text-muted-foreground ml-1 italic -mt-2">Se vazio, usará o horário da barbearia.</p>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-1">Início do Expediente</Label>
                        <Input
                          type="time"
                          value={formData.horario_inicio}
                          onChange={(e) => setFormData({ ...formData, horario_inicio: e.target.value })}
                          className="h-14 bg-black border-white/10 rounded-2xl px-6"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-1">Fim do Expediente</Label>
                        <Input
                          type="time"
                          value={formData.horario_fim}
                          onChange={(e) => setFormData({ ...formData, horario_fim: e.target.value })}
                          className="h-14 bg-black border-white/10 rounded-2xl px-6"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-1">Dias de Trabalho</Label>
                      <div className="flex flex-wrap gap-2">
                        {diasSemana.map((dia) => {
                          const isSelected = formData.dias_trabalho.includes(dia.id);
                          return (
                            <button
                              key={dia.id}
                              type="button"
                              onClick={() => {
                                const newDias = isSelected
                                  ? formData.dias_trabalho.filter(id => id !== dia.id)
                                  : [...formData.dias_trabalho, dia.id].sort();
                                setFormData({ ...formData, dias_trabalho: newDias });
                              }}
                              className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                isSelected
                                  ? "bg-primary text-black border-primary shadow-gold"
                                  : "bg-white/5 text-muted-foreground border-white/5 hover:bg-white/10"
                              )}
                            >
                              {dia.nome}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-6">
                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-14 px-8 rounded-2xl font-bold">Cancelar</Button>
                    <Button type="submit" className="h-14 px-12 bg-primary text-black font-black rounded-2xl shadow-gold hover:opacity-90">
                      {editingId ? 'Confirmar Ajustes' : 'Integrar à Equipe'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </motion.div>
        </div>
      </section>

      {/* Control & Search Bar */}
      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row gap-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Localizar integrante pelo nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-16 pl-14 pr-6 bg-white/[0.03] border-white/10 rounded-2xl focus:border-primary/50 text-lg transition-all"
          />
        </div>
        <div className="flex items-center gap-4 bg-black/20 px-6 py-2 rounded-2xl border border-white/5 text-sm font-bold uppercase tracking-widest text-muted-foreground">
          <Users className="h-5 w-5 text-primary" />
          Ativos: <span className="text-white ml-1">{funcionarios.filter(f => f.ativo).length}</span>
        </div>
      </div>

      {/* Staff Grid */}
      <AnimatePresence mode="popLayout">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredFuncionarios.map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="z-10"
            >
              <CardContainer className="inter-var w-full p-0">
                <CardBody className="bg-gradient-to-br from-black/60 to-black/20 backdrop-blur-3xl relative group/card border-white/5 w-full h-auto rounded-[3rem] p-8 border hover:shadow-2xl transition-all">

                  <CardItem translateZ="100" className="w-full flex justify-center mb-8 relative">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-2 border-primary shadow-gold group-hover:rotate-3 transition-transform duration-500">
                        {f.foto_url ? (
                          <img src={f.foto_url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#111] flex items-center justify-center">
                            <Users className="h-12 w-12 text-primary/40" />
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl border-4 border-[#090b10] shadow-lg flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      </div>
                    </div>
                  </CardItem>

                  <CardItem translateZ="50" className="w-full text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <h3 className="text-2xl font-black text-white">{f.nome}</h3>
                      {f.nivel_acesso === 'administrador' && <Crown className="h-5 w-5 text-yellow-500 shadow-gold" />}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant="outline" className="bg-white/5 border-white/10 text-primary uppercase tracking-[0.2em] text-[9px] font-black py-1 px-3">
                        {f.cargo}
                      </Badge>
                      <Badge variant="outline" className="bg-white/5 border-white/10 text-muted-foreground uppercase tracking-[0.2em] text-[9px] font-black py-1 px-3">
                        {f.nivel_acesso}
                      </Badge>
                    </div>
                  </CardItem>

                  <CardItem translateZ="40" className="w-full space-y-4 mb-8">
                    <div className="flex items-center gap-4 text-muted-foreground text-sm font-medium bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-colors">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="truncate">{f.email}</span>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground text-sm font-medium bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-colors">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span>Comissão: <strong className="text-white ml-1">{f.tipo_comissao === 'percentual' ? `${f.valor_comissao}%` : `R$ ${f.valor_comissao.toFixed(2)}`}</strong></span>
                    </div>
                  </CardItem>

                  <CardItem translateZ="120" className="flex items-center justify-between relative z-[150] w-full">
                    <div className="flex gap-3 relative z-[160]">
                      <Button
                        onClick={() => {
                          handleEdit(f);
                        }}
                        size="icon"
                        variant="ghost"
                        className="h-12 w-12 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-black shadow-lg transition-all active:scale-90"
                      >
                        <Pencil className="h-5 w-5" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-12 w-12 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white shadow-lg transition-all active:scale-90"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-zinc-950 border-white/10 text-white rounded-[2.5rem] p-8 z-[200]">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-3xl font-black uppercase italic">Desligar Membro?</AlertDialogTitle>
                            <AlertDialogDescription className="text-zinc-400 text-lg">
                              Deseja realmente desligar <span className="text-white font-bold">{f.nome}</span>? O histórico será preservado, mas o acesso será removido.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="mt-8 gap-4">
                            <AlertDialogCancel className="h-14 px-8 rounded-2xl bg-transparent border-white/10 hover:bg-white/5">Manter</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(f.id)}
                              className="h-14 px-8 rounded-2xl bg-red-600 text-white font-black hover:bg-red-500 transition-colors"
                            >
                              Sim, Confirmar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="flex flex-col items-end opacity-40">
                      <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Ativo</span>
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                  </CardItem>

                  {/* Decorative Elements */}
                  <div className="absolute top-0 left-0 w-2 h-2 rounded-full bg-primary/20 m-6 shadow-[0_0_20px_#eab308]" />
                </CardBody>
              </CardContainer>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}