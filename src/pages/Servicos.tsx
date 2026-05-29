import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import {
  Plus,
  Pencil,
  Trash2,
  Scissors,
  Clock,
  DollarSign,
  Sparkles,
  Zap,
  ChevronRight,
  Search,
  Filter,
  MoreVertical
} from "lucide-react";
import { useServicos, useCreateServico, useUpdateServico, useDeleteServico, Servico } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { CardContainer, CardBody, CardItem } from "@/components/ui/card-3d";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ImageUpload";

export default function Servicos() {
  const { data: servicos, isLoading } = useServicos();
  const createServico = useCreateServico();
  const updateServico = useUpdateServico();
  const deleteServico = useDeleteServico();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    nome: "",
    preco: "",
    duracao_minutos: "",
    foto_url: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const servicoData = {
      nome: formData.nome,
      preco: parseFloat(formData.preco),
      duracao_minutos: parseInt(formData.duracao_minutos),
      foto_url: formData.foto_url,
    };

    if (editingServico) {
      await updateServico.mutateAsync({
        id: editingServico.id,
        ...servicoData,
      });
    } else {
      await createServico.mutateAsync(servicoData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ nome: "", preco: "", duracao_minutos: "", foto_url: "" });
    setEditingServico(null);
  };

  const handleEdit = (servico: Servico) => {
    setEditingServico(servico);
    setFormData({
      nome: servico.nome,
      preco: servico.preco.toString(),
      duracao_minutos: servico.duracao_minutos.toString(),
      foto_url: servico.foto_url || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteServico.mutateAsync(id);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins > 0 ? mins + 'min' : ''}`;
    }
    return `${mins}min`;
  };

  const filteredServicos = servicos?.filter(s =>
    s.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-8 p-6">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48 bg-white/5" />
            <Skeleton className="h-4 w-64 bg-white/5" />
          </div>
          <Skeleton className="h-12 w-40 bg-white/5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-[2rem] bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <section className="relative p-8 md:p-12 rounded-[2.5rem] bg-black/40 border border-white/5 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 blur-[120px] -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                <Scissors className="h-8 w-8 text-primary shadow-gold" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Serviços</h1>
                <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 uppercase tracking-[0.2em] font-bold text-[10px] mt-1">
                  Catálogo de Artesia
                </Badge>
              </div>
            </div>
            <p className="text-muted-foreground text-lg font-medium opacity-80 pl-2">Personalize a experiência dos seus clientes com precisão.</p>
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="h-16 px-8 bg-gradient-gold text-black font-black text-lg rounded-2xl shadow-gold border-0 gap-3"
                  onClick={resetForm}
                >
                  <Plus className="h-6 w-6" />
                  Novo Estilo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-zinc-950 border-white/10 text-white backdrop-blur-xl custom-scrollbar">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                    <Sparkles className="h-6 w-6 text-primary" />
                    {editingServico ? "Refinar Serviço" : "Cadastrar Serviço"}
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400">Preencha os detalhes técnicos do serviço.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                  <div className="mb-6">
                    <ImageUpload
                      label="Foto de Capa do Serviço"
                      currentImage={formData.foto_url}
                      onImageUploaded={(url) => setFormData(prev => ({ ...prev, foto_url: url }))}
                      bucket="services"
                      folder={`servicos`}
                      aspectRatio="16/9"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-1">Assinatura do Serviço</Label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                      placeholder="Ex: Corte Degradê Master"
                      className="h-14 bg-white/5 border-white/10 focus:border-primary/50 text-lg rounded-2xl px-6"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-1">Valor (R$)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.preco}
                          onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                          required
                          className="h-14 bg-white/5 border-white/10 focus:border-primary/50 text-lg rounded-2xl pl-12 pr-6"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="uppercase text-[10px] tracking-widest font-black text-muted-foreground ml-1">Duração (Min)</Label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-400" />
                        <Input
                          type="number"
                          value={formData.duracao_minutos}
                          onChange={(e) => setFormData({ ...formData, duracao_minutos: e.target.value })}
                          required
                          className="h-14 bg-white/5 border-white/10 focus:border-primary/50 text-lg rounded-2xl pl-12 pr-6"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="gap-3 mt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-14 rounded-2xl hover:bg-white/5 px-8 font-bold">Cancelar</Button>
                    <Button type="submit" className="h-14 bg-primary text-black font-black px-12 rounded-2xl shadow-gold hover:opacity-90">{editingServico ? "Salvar Alterações" : "Publicar Serviço"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </motion.div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Buscar por nome do serviço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-16 pl-14 pr-6 bg-white/[0.03] border-white/10 rounded-2xl focus:border-primary/50 transition-all font-medium text-lg"
          />
        </div>
        <Button variant="outline" className="h-16 px-8 rounded-2xl border-white/10 bg-white/[0.03] hover:bg-white/5 gap-3 font-bold">
          <Filter className="h-5 w-5" /> Filtros Avançados
        </Button>
      </div>

      {/* Services Grid */}
      <AnimatePresence mode="popLayout">
        {filteredServicos && filteredServicos.length > 0 ? (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filteredServicos.map((servico, i) => (
              <motion.div
                layout
                key={servico.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
              >
                <CardContainer className="inter-var w-full p-0">
                  <CardBody className="bg-gradient-to-br from-black/60 to-black/20 backdrop-blur-3xl relative group/card border-white/5 w-full h-auto rounded-[2.5rem] p-8 border hover:shadow-2xl hover:shadow-primary/10 transition-all">

                    {/* Decorative Floating Icon */}
                    <CardItem translateZ="100" className="absolute -top-4 -right-4">
                      <div className="w-16 h-16 rounded-2xl bg-[#090b10] border border-white/10 flex items-center justify-center shadow-2xl group-hover:rotate-12 transition-transform duration-500">
                        <Scissors className="h-8 w-8 text-primary shadow-gold" />
                      </div>
                    </CardItem>



                    {servico.foto_url && (
                      <CardItem translateZ="80" className="w-full h-40 mb-4 rounded-2xl overflow-hidden relative shadow-lg group-hover:shadow-primary/20 transition-all border border-white/10">
                        <img src={servico.foto_url} alt={servico.nome} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                      </CardItem>
                    )}

                    <CardItem translateZ="50" className="w-full">
                      <Badge className="bg-primary/10 text-primary border-primary/20 mb-4 px-3 py-1 uppercase tracking-widest text-[9px] font-black">
                        Estilo Assinado
                      </Badge>
                      <h3 className="text-2xl font-black text-white leading-tight mb-2 group-hover:text-primary transition-colors">
                        {servico.nome}
                      </h3>
                      <p className="text-sm text-muted-foreground font-medium flex items-center gap-2 mb-8">
                        <Clock className="h-4 w-4 text-primary" />
                        Duração estimada: <span className="text-white">{formatDuration(servico.duracao_minutos)}</span>
                      </p>
                    </CardItem>

                    <CardItem translateZ="60" className="w-full flex items-end justify-between mt-auto">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Valor do Serviço</p>
                        <p className="text-3xl font-black text-white">
                          {formatPrice(servico.preco)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(servico)}
                          className="h-12 w-12 rounded-xl bg-white/5 hover:bg-primary hover:text-black transition-all"
                        >
                          <Pencil className="h-5 w-5" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-12 w-12 rounded-xl bg-white/5 hover:bg-destructive hover:text-white transition-all text-destructive"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-zinc-950 border-white/10 text-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-2xl font-black">Extinguir Estilo?</AlertDialogTitle>
                              <AlertDialogDescription className="text-zinc-400">
                                Você está prestes a deletar o serviço <span className="text-white font-bold">"{servico.nome}"</span>. Esta ação removerá o catálogo e afetará agendamentos futuros.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-6">
                              <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5">Manter Serviço</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(servico.id)} className="bg-destructive text-white hover:bg-destructive/90 font-bold">Sim, Remover</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardItem>

                    {/* Interactive Background Gradient */}
                    <CardItem translateZ="-20" className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem]" />
                  </CardBody>
                </CardContainer>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center space-y-6"
          >
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
              <Scissors className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">O Catálogo está Vazio</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">Adicione novos serviços para que seus clientes possam agendar sua próxima transformação.</p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-primary text-black font-black px-8 py-6 rounded-2xl shadow-gold h-auto">
              <Plus className="h-5 w-5 mr-2" /> Começar Agora
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}