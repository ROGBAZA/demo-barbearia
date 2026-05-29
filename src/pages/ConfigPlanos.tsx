import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Plus, Pencil, Trash2, CreditCard, Hash, Info, Scissors } from "lucide-react";
import { usePlanos, useCreatePlano, useUpdatePlano, useDeletePlano, Plano } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";

export default function ConfigPlanos() {
    const { data: planos, isLoading } = usePlanos();
    const createPlano = useCreatePlano();
    const updatePlano = useUpdatePlano();
    const deletePlano = useDeletePlano();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPlano, setEditingPlano] = useState<Plano | null>(null);
    const [formData, setFormData] = useState({
        nome: "",
        preco: 0,
        limite_cortes: 4,
        limite_barbas: 0,
        duracao_meses: 1,
        descricao: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingPlano) {
                await updatePlano.mutateAsync({
                    id: editingPlano.id,
                    ...formData,
                });
            } else {
                await createPlano.mutateAsync(formData);
            }
            setIsDialogOpen(false);
            resetForm();
        } catch (error) {
            console.error("Erro ao salvar plano:", error);
        }
    };

    const resetForm = () => {
        setFormData({
            nome: "",
            preco: 0,
            limite_cortes: 4,
            limite_barbas: 0,
            duracao_meses: 1,
            descricao: ""
        });
        setEditingPlano(null);
    };

    const handleEdit = (plano: Plano) => {
        setEditingPlano(plano);
        setFormData({
            nome: plano.nome,
            preco: Number(plano.preco),
            limite_cortes: plano.limite_cortes,
            limite_barbas: plano.limite_barbas || 0,
            duracao_meses: plano.duracao_meses,
            descricao: plano.descricao || "",
        });
        setIsDialogOpen(true);
    };

    if (isLoading) {
        return (
            <div className="space-y-6 animate-fade-in">
                <Skeleton className="h-8 w-48 mb-2" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <CreditCard className="h-8 w-8 text-primary" />
                        Planos de Assinatura
                    </h1>
                    <p className="text-muted-foreground">Configure os planos recorrentes para seus clientes</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            className="bg-gradient-gold hover:bg-primary/90 text-primary-foreground font-medium"
                            onClick={resetForm}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Criar Novo Plano
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                        <DialogHeader>
                            <DialogTitle className="text-card-foreground">
                                {editingPlano ? "Editar Plano" : "Novo Plano de Assinatura"}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="nome">Nome do Plano *</Label>
                                <Input
                                    id="nome"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    required
                                    placeholder="Ex: Plano Master"
                                    className="bg-input border-border"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="preco">Preço Mensal (R$) *</Label>
                                    <Input
                                        id="preco"
                                        type="number"
                                        step="0.01"
                                        value={formData.preco}
                                        onChange={(e) => setFormData({ ...formData, preco: Number(e.target.value) })}
                                        required
                                        className="bg-input border-border"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cortes">Limite de Cortes *</Label>
                                    <Input
                                        id="cortes"
                                        type="number"
                                        value={formData.limite_cortes}
                                        onChange={(e) => setFormData({ ...formData, limite_cortes: Number(e.target.value) })}
                                        required
                                        className="bg-input border-border"
                                    />
                                    <p className="text-[10px] text-muted-foreground">999 = Ilimitado</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="barbas">Limite de Barbas *</Label>
                                    <Input
                                        id="barbas"
                                        type="number"
                                        value={formData.limite_barbas}
                                        onChange={(e) => setFormData({ ...formData, limite_barbas: Number(e.target.value) })}
                                        required
                                        className="bg-input border-border"
                                    />
                                    <p className="text-[10px] text-muted-foreground">999 = Ilimitado</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="descricao">Descrição / Vantagens</Label>
                                <Textarea
                                    id="descricao"
                                    value={formData.descricao}
                                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                                    placeholder="Destaque o que o plano oferece..."
                                    className="bg-input border-border"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsDialogOpen(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-gradient-gold hover:bg-primary/90"
                                    disabled={createPlano.isPending || updatePlano.isPending}
                                >
                                    {editingPlano ? "Atualizar Plano" : "Criar Plano"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {planos?.map((plano) => (
                    <Card key={plano.id} className={`bg-gradient-card border-border/50 relative overflow-hidden group hover:border-primary/50 transition-all ${plano.nome.toLowerCase().includes('pro') ? 'border-primary/30 shadow-gold' : ''}`}>
                        {plano.nome.toLowerCase().includes('pro') && (
                            <div className="absolute top-0 right-0 bg-primary px-3 py-1 rounded-bl-xl text-[10px] font-black uppercase italic shadow-2xl z-20">Destaque</div>
                        )}
                        <CardHeader>
                            <CardTitle className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black italic uppercase tracking-tighter">{plano.nome}</h3>
                                    <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-tighter">
                                        <div className="flex items-center gap-1.5 text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                            <Scissors className="h-3 w-3" />
                                            {plano.limite_cortes >= 999 ? 'ILIMITADO' : `${plano.limite_cortes} CORTES`}
                                        </div>
                                        {plano.limite_barbas > 0 && (
                                            <div className="flex items-center gap-1.5 text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                                <Hash className="h-3 w-3" />
                                                {plano.limite_barbas >= 999 ? 'ILIMITADO' : `${plano.limite_barbas} BARBAS`}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center py-4 bg-black/20 rounded-2xl border border-white/5">
                                <p className="text-xs text-muted-foreground uppercase tracking-widest leading-none mb-1">Valor Mensal</p>
                                <p className="text-4xl font-black text-white italic">
                                    <span className="text-sm font-bold text-primary mr-1">R$</span>
                                    {Number(plano.preco).toFixed(2)}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground flex items-start gap-2">
                                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    {plano.descricao || "Sem benefícios adicionais descritos."}
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex gap-2 border-t border-white/5 pt-4">
                            <Button
                                variant="outline"
                                className="flex-1 hover:bg-primary/10 hover:text-primary transition-all rounded-xl"
                                onClick={() => handleEdit(plano)}
                            >
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="aspect-square p-0 hover:bg-destructive/10 hover:text-destructive transition-all rounded-xl"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-card border-border">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir Plano</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Tem certeza que deseja aplicar a exclusão do plano "{plano.nome}"? Isso não afetará quem já assinou, mas novos clientes não poderão escolher este plano.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => deletePlano.mutate(plano.id)}
                                            className="bg-destructive hover:bg-destructive/90"
                                        >
                                            Confirmar Exclusão
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {planos?.length === 0 && (
                <div className="text-center py-20 bg-muted/20 border border-dashed border-white/10 rounded-3xl">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-bold">Nenhum plano configurado</h3>
                    <p className="text-muted-foreground">Crie seu primeiro plano para começar a vender assinaturas recorrentes.</p>
                </div>
            )}
        </div>
    );
}
