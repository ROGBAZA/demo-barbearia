import { useState } from 'react';
import {
    Bell,
    Check,
    CheckCheck,
    Trash2,
    Calendar,
    X,
    AlertCircle,
    Clock,
    Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
    useNotificacoes,
    useNotificacoesNaoLidas,
    useMarcarNotificacaoLida,
    useMarcarTodasLidas,
    useDeletarNotificacao,
    useRealtimeNotificacoes,
    type Notificacao,
} from '@/hooks/useNotificacoes';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const iconMap = {
    novo_agendamento: Calendar,
    cancelamento: X,
    lembrete: Clock,
    fila_proximo: Users,
    sistema: AlertCircle,
};

const colorMap = {
    novo_agendamento: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    cancelamento: 'bg-red-500/10 text-red-500 border-red-500/20',
    lembrete: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    fila_proximo: 'bg-green-500/10 text-green-500 border-green-500/20',
    sistema: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

function NotificationItem({ notificacao }: { notificacao: Notificacao }) {
    const marcarLida = useMarcarNotificacaoLida();
    const deletar = useDeletarNotificacao();

    const Icon = iconMap[notificacao.tipo] || AlertCircle;
    const colorClass = colorMap[notificacao.tipo] || colorMap.sistema;

    const handleMarcarLida = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!notificacao.lida) {
            marcarLida.mutate(notificacao.id);
        }
    };

    const handleDeletar = (e: React.MouseEvent) => {
        e.stopPropagation();
        deletar.mutate(notificacao.id);
    };

    return (
        <div
            className={`group relative p-4 rounded-xl border transition-all hover:bg-white/5 cursor-pointer ${notificacao.lida ? 'opacity-60 bg-black/20' : 'bg-black/40 border-primary/20'
                }`}
        >
            {/* Badge de não lida */}
            {!notificacao.lida && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}

            <div className="flex gap-3">
                {/* Ícone */}
                <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center shrink-0 border`}>
                    <Icon className="h-5 w-5" />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-sm ${notificacao.lida ? 'text-muted-foreground' : 'text-white'}`}>
                        {notificacao.titulo}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notificacao.mensagem}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notificacao.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                        })}
                    </p>
                </div>

                {/* Ações */}
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notificacao.lida && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-primary/10 text-primary"
                            onClick={handleMarcarLida}
                            disabled={marcarLida.isPending}
                        >
                            <Check className="h-3 w-3" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-red-500/10 text-red-400"
                        onClick={handleDeletar}
                        disabled={deletar.isPending}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function NotificationCenter() {
    const [open, setOpen] = useState(false);
    const { data: todasNotificacoes = [] } = useNotificacoes();
    const { data: naoLidas = [] } = useNotificacoesNaoLidas();
    const marcarTodasLidas = useMarcarTodasLidas();

    // Ativar escuta em tempo real
    useRealtimeNotificacoes();

    const countNaoLidas = naoLidas.length;
    const hasNotificacoes = todasNotificacoes.length > 0;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-10 w-10 rounded-xl hover:bg-white/10"
                >
                    <Bell className="h-5 w-5" />
                    {countNaoLidas > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-black animate-pulse"
                        >
                            {countNaoLidas > 9 ? '9+' : countNaoLidas}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[380px] p-0 bg-black/95 border-white/10 backdrop-blur-xl"
                align="end"
                sideOffset={8}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div>
                        <h3 className="font-black text-white">Notificações</h3>
                        {countNaoLidas > 0 && (
                            <p className="text-xs text-muted-foreground">
                                {countNaoLidas} {countNaoLidas === 1 ? 'nova' : 'novas'}
                            </p>
                        )}
                    </div>
                    {countNaoLidas > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => marcarTodasLidas.mutate()}
                            disabled={marcarTodasLidas.isPending}
                            className="h-8 text-xs hover:bg-primary/10 text-primary"
                        >
                            <CheckCheck className="h-3 w-3 mr-1" />
                            Marcar todas lidas
                        </Button>
                    )}
                </div>

                {/* Lista de notificações */}
                {hasNotificacoes ? (
                    <ScrollArea className="h-[400px]">
                        <div className="p-2 space-y-2">
                            {todasNotificacoes.map((notif) => (
                                <NotificationItem key={notif.id} notificacao={notif} />
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                            <Bell className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-white font-medium">Nenhuma notificação</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Você está em dia! 🎉
                        </p>
                    </div>
                )}

                {/* Footer */}
                {hasNotificacoes && (
                    <>
                        <Separator className="bg-white/10" />
                        <div className="p-3 text-center">
                            <p className="text-[10px] text-muted-foreground">
                                Notificações em tempo real ativadas ✨
                            </p>
                        </div>
                    </>
                )}
            </PopoverContent>
        </Popover>
    );
}
