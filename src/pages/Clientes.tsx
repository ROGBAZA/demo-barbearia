import { useState } from "react";
import { useClientes, useUpdateCliente, useDeleteCliente, usePlanos, useVincularPlano, useAssinaturasCliente } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, UserPlus, Pencil, Trash2, Phone, Mail, History,
  Zap, Scissors, Star, Crown, XCircle, Users, UserCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CardContainer, CardBody, CardItem } from "@/components/ui/card-3d";
import { useTenant } from "@/contexts/TenantContext";
import { useNavigate, useLocation } from "react-router-dom";

export default function Clientes() {
  const { tenant } = useTenant();
  const { data: clientes, isLoading } = useClientes();
  const { data: planos } = usePlanos();
  const { data: allSubscriptions } = useAssinaturasCliente();
  const updateCliente = useUpdateCliente();
  const deleteCliente = useDeleteCliente();
  const vincularPlanoMutation = useVincularPlano();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<any>(null);
  const [formData, setFormData] = useState({ nome: "", telefone: "", email: "" });

  const [isLinkingPlano, setIsLinkingPlano] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [vincularPlano, setVincularPlano] = useState({
    plano_id: "",
    cortes_iniciais: 0,
    barbas_iniciais: 0
  });

  const filter = new URLSearchParams(location.search).get('filter');

  const filteredClientes = (clientes || []).filter(c => {
    const matchesSearch =
      c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.telefone?.includes(searchQuery) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase());

    if (filter === 'vip') {
      const hasSub = allSubscriptions?.some(s => s.cliente_id === c.id && s.status === 'ativo');
      return matchesSearch && hasSub;
    }
    return matchesSearch;
  });

  const getClientSubscription = (clienteId: string) => {
    return allSubscriptions?.find(s => s.cliente_id === clienteId && s.status === 'ativo');
  };

  const handleEdit = (cliente: any) => {
    setEditingCliente(cliente);
    setFormData({
      nome: cliente.nome,
      telefone: cliente.telefone || "",
      email: cliente.email || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCliente.mutateAsync(id);
      toast({ title: "VIP Removido", description: "O registro foi excluído com sucesso." });
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível excluir o cliente.", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCliente) {
        await updateCliente.mutateAsync({ id: editingCliente.id, ...formData });
        toast({ title: "Perfil Atualizado", description: "As alterações foram salvas." });
      } else {
        // Criar cliente está em useCreateCliente, mas aqui o foco é gerenciar
        // Para simplificar vamos focar na edição e listagem
      }
      setIsDialogOpen(false);
      setEditingCliente(null);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao processar operação.", variant: "destructive" });
    }
  };

  const handleVincularPlano = async () => {
    if (!selectedClienteId || !vincularPlano.plano_id) return;
    try {
      await vincularPlanoMutation.mutateAsync({
        cliente_id: selectedClienteId,
        ...vincularPlano
      });
      toast({ title: "VIP Ativado!", description: "Plano vinculado com sucesso ao cliente." });
      setIsLinkingPlano(false);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao vincular plano.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Zap className="h-12 w-12 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Header Premium */}
      <section className="relative overflow-hidden bg-black/40 border border-white/5 rounded-[3rem] p-10 md:p-16 backdrop-blur-3xl shadow-2xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 blur-[120px] -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <div className="flex items-center gap-6 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20 shadow-gold/20">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">Gestão VIP</h1>
            </div>
            <p className="text-muted-foreground text-lg md:text-xl font-medium max-w-xl italic opacity-70">
              Controle absoluto da sua base de clientes selecionados e recorrentes.
            </p>
          </motion.div>

          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex gap-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="bg-zinc-950 border-white/10 text-white rounded-[3rem] p-10 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-black">
                    {editingCliente ? 'Atualizar VIP' : 'Novo Registro VIP'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-8 mt-6">
                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-2">Nome Completo</Label>
                    <div className="relative group">
                      <UserCircle className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        className="h-16 pl-14 bg-black border-white/10 rounded-2xl text-lg focus:border-primary/50" required placeholder="Ex: Arthur Morgan" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-2">Contato</Label>
                      <div className="relative group">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                          className="h-16 pl-14 bg-black border-white/10 rounded-2xl text-lg" placeholder="(99) 99999-9999" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-2">Email</Label>
                      <div className="relative group">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="h-16 pl-14 bg-black border-white/10 rounded-2xl text-lg" placeholder="vip@exemplo.com" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-16 px-10 rounded-2xl font-bold">Cancelar</Button>
                    <Button type="submit" className="h-16 px-14 bg-primary text-black font-black rounded-2xl shadow-gold hover:opacity-90 transition-all">
                      {editingCliente ? 'Salvar Registro' : 'Confirmar Cadastro'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </motion.div>
        </div>
      </section>

      {/* Modern Filter Bar */}
      <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-6 backdrop-blur-3xl shadow-2xl flex flex-col lg:flex-row gap-8 items-center">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Localizar VIP pelo nome, telefone ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-20 pl-16 pr-8 bg-white/[0.03] border-white/10 rounded-[1.8rem] text-xl focus:border-primary/50 transition-all outline-none"
          />
        </div>
        <div className="flex gap-4 w-full lg:w-auto shrink-0">
          <div className="flex items-center gap-4 bg-black/40 px-8 py-5 rounded-[1.8rem] border border-white/5">
            <Users className="h-6 w-6 text-primary" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Total VIPs</span>
              <span className="text-2xl font-black text-white leading-none">{filteredClientes.length}</span>
            </div>
          </div>
          {filter && (
            <Button variant="ghost" className="h-20 w-20 rounded-[1.8rem] bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/10"
              onClick={() => navigate('/clientes', { replace: true, state: {} })}>
              <XCircle className="h-8 w-8" />
            </Button>
          )}
        </div>
      </div>

      {/* VIP Grid - Cinematic Entrance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        <AnimatePresence mode="popLayout">
          {filteredClientes?.map((cliente, idx) => {
            const sub = getClientSubscription(cliente.id);
            return (
              <motion.div
                layout
                key={cliente.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.05 }}
              >
                <CardContainer className="inter-var w-full">
                  <CardBody className="bg-[#0b0d12] border-white/5 group/card hover:shadow-2xl hover:shadow-primary/10 w-auto h-auto rounded-[3rem] p-10 border transition-all duration-500 hover:border-primary/20 backdrop-blur-3xl">
                    <div className="relative">
                      {/* Subscription Status Badge */}
                      <CardItem translateZ="80" className="absolute -top-4 -right-2">
                        {sub ? (
                          <div className="px-5 py-2 bg-gradient-gold text-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-gold animate-pulse">
                            VIP PREMIUM
                          </div>
                        ) : (
                          <div className="px-5 py-2 bg-white/5 text-muted-foreground border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest">
                            STANDARD
                          </div>
                        )}
                      </CardItem>

                      <div className="flex items-start gap-6 mb-10">
                        <CardItem translateZ="100" className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary/20 to-transparent border border-white/10 flex items-center justify-center relative overflow-hidden shrink-0 group-hover/card:rotate-6 transition-transform">
                          <span className="text-3xl font-black text-primary">{cliente.nome.charAt(0)}</span>
                          <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />
                        </CardItem>
                        <CardItem translateZ="50" className="flex-1 pt-2">
                          <h3 className="text-2xl font-black text-white group-hover/card:text-primary transition-colors leading-tight break-words">{cliente.nome}</h3>
                          <div className="flex flex-col gap-1 mt-2">
                            <span className="text-xs font-bold text-muted-foreground flex items-center gap-2 italic">
                              <Phone className="h-3 w-3 text-primary" /> {cliente.telefone || '-'}
                            </span>
                            <span className="text-xs font-bold text-muted-foreground flex items-center gap-2 break-all opacity-60">
                              <History className="h-3.5 w-3.5 text-primary" />
                              {cliente.ultima_visita ? new Date(cliente.ultima_visita).toLocaleDateString('pt-BR') : 'Inédito'}
                            </span>
                          </div>
                        </CardItem>
                      </div>

                      <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                        <CardItem translateZ="60" className="flex-1">
                          <Button
                            onClick={() => handleEdit(cliente)}
                            variant="ghost"
                            className="w-full h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase"
                          >
                            Detalhes
                          </Button>
                        </CardItem>
                        <CardItem translateZ="60" className="flex gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-14 w-14 rounded-2xl bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/10">
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-zinc-950 border-white/10 text-white rounded-[3rem] p-10">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-3xl font-black">Apagar Registro VIP?</AlertDialogTitle>
                                <AlertDialogDescription className="text-zinc-400 text-lg">
                                  Esta ação removerá <span className="text-white font-bold">{cliente.nome}</span>. Esta operação é irreversível.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="mt-10 gap-4">
                                <AlertDialogCancel className="h-16 px-10 rounded-2xl bg-transparent border-white/10 hover:bg-white/5">Manter Cliente</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(cliente.id)} className="h-16 px-12 bg-red-500 text-white font-black rounded-2xl shadow-lg shadow-red-500/20">Sim, Confirmar Exclusão</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Button
                            onClick={() => { setSelectedClienteId(cliente.id); setIsLinkingPlano(true); }}
                            className="h-14 w-14 rounded-2xl bg-primary text-black shadow-gold hover:scale-105 transition-all p-0"
                            title="Plano VIP"
                          >
                            <Zap className="h-5 w-5" />
                          </Button>
                        </CardItem>
                      </div>
                    </div>
                  </CardBody>
                </CardContainer>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Modern Subscription Manager */}
      <Dialog open={isLinkingPlano} onOpenChange={setIsLinkingPlano}>
        <DialogContent className="sm:max-w-4xl bg-zinc-950 border-white/10 text-white backdrop-blur-3xl p-0 overflow-hidden rounded-[2.5rem] md:rounded-[4rem] shadow-[0_0_80px_rgba(234,179,8,0.1)]">
          <div className="grid grid-cols-1 lg:grid-cols-5 h-full max-h-[90vh] overflow-y-auto lg:overflow-visible">
            <div className="lg:col-span-3 p-8 md:p-12 border-b lg:border-b-0 lg:border-r border-white/5 space-y-10">
              <DialogHeader>
                <DialogTitle className="text-4xl font-black flex items-center gap-4">
                  <Crown className="h-10 w-10 text-primary shadow-gold" />
                  Gestor de Assinaturas
                </DialogTitle>
                <DialogDescription className="text-zinc-400 text-lg">Padrão Route 66 de fidelização e estilo recorrente.</DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <Label className="uppercase text-[10px] tracking-[0.4em] font-black text-white/40 ml-2">Planos de Assinatura Disponíveis</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[450px] overflow-y-auto pr-4 custom-scrollbar">
                  {planos?.map(p => (
                    <motion.div key={p.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} onClick={() => setVincularPlano(v => ({ ...v, plano_id: p.id, cortes_iniciais: p.limite_cortes, barbas_iniciais: p.limite_barbas || 0 }))}
                      className={`p-8 rounded-[2.5rem] border transition-all cursor-pointer relative overflow-hidden group ${vincularPlano.plano_id === p.id ? 'bg-primary/20 border-primary shadow-gold' : 'bg-white/5 border-white/10 hover:border-white/30'}`}>
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-6">
                          <h4 className={`text-xl font-black uppercase tracking-tight ${vincularPlano.plano_id === p.id ? 'text-primary' : 'text-white'}`}>{p.nome}</h4>
                          <span className="text-2xl font-black text-white">R$ {Number(p.preco).toFixed(0)}</span>
                        </div>
                        <div className="mt-auto flex flex-col gap-2">
                          <div className="flex items-center gap-3">
                            <Scissors className="h-4 w-4 text-primary" />
                            <span className="text-sm font-bold">{p.limite_cortes >= 999 ? 'Cortes Ilimitados' : `${p.limite_cortes} Cortes / Mês`}</span>
                          </div>
                          {p.limite_barbas > 1 && (
                            <div className="flex items-center gap-3">
                              <Star className="h-4 w-4 text-blue-400" />
                              <span className="text-sm font-bold">{p.limite_barbas} Barbas / Mês</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white/[0.03] p-12 space-y-10 flex flex-col">
              <div className="space-y-8 flex-1">
                <h4 className="border-l-4 border-primary pl-4 text-xl font-black uppercase tracking-tighter">Ajuste de Saldo</h4>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="uppercase text-[9px] font-black tracking-widest text-muted-foreground ml-2">Cortes Iniciais</Label>
                    <div className="relative group">
                      <Scissors className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-primary group-focus-within:rotate-12 transition-transform" />
                      <Input type="number" value={vincularPlano.cortes_iniciais} onChange={(e) => setVincularPlano({ ...vincularPlano, cortes_iniciais: Number(e.target.value) })}
                        className="h-20 bg-black border-white/10 rounded-[2rem] text-3xl font-black text-center pr-6 outline-none focus:border-primary/50" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="uppercase text-[9px] font-black tracking-widest text-muted-foreground ml-2">Barbas Iniciais</Label>
                    <div className="relative group">
                      <Star className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-blue-400" />
                      <Input type="number" value={vincularPlano.barbas_iniciais} onChange={(e) => setVincularPlano({ ...vincularPlano, barbas_iniciais: Number(e.target.value) })}
                        className="h-20 bg-black border-white/10 rounded-[2rem] text-3xl font-black text-center pr-6 outline-none focus:border-white/20" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Button onClick={handleVincularPlano} disabled={!vincularPlano.plano_id || vincularPlanoMutation.isPending}
                  className="h-20 w-full bg-gradient-gold text-black font-black text-xl rounded-[2rem] shadow-gold hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Ativar Recorrência VIP
                </Button>
                <Button variant="ghost" onClick={() => setIsLinkingPlano(false)} className="h-16 w-full rounded-2xl font-bold opacity-40 hover:opacity-100 transition-opacity">Abortar Escaneamento</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}