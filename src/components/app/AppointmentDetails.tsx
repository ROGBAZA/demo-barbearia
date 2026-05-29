import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Scissors, User, Phone, Mail, MapPin, BadgeCheck, XCircle, Clock as ClockIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  foto?: string;
}

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao: number;
}

interface Funcionario {
  id: string;
  nome: string;
  foto?: string;
}

export interface AppointmentDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: string;
    cliente: Cliente;
    servico: Servico;
    funcionario: Funcionario;
    data_hora: string;
    status: "agendado" | "concluido" | "cancelado";
    observacoes?: string;
  } | null;
}

export function AppointmentDetails({ isOpen, onClose, appointment }: AppointmentDetailsProps) {
  if (!appointment) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "HH:mm", { locale: ptBR });
  };

  const getStatusBadge = () => {
    const statusConfig = {
      agendado: {
        text: "Agendado",
        icon: <ClockIcon className="h-4 w-4 mr-1" />,
        className: "bg-blue-100 text-blue-800"
      },
      concluido: {
        text: "Concluído",
        icon: <BadgeCheck className="h-4 w-4 mr-1" />,
        className: "bg-green-100 text-green-800"
      },
      cancelado: {
        text: "Cancelado",
        icon: <XCircle className="h-4 w-4 mr-1" />,
        className: "bg-red-100 text-red-800"
      }
    };

    const { text, icon, className } = statusConfig[appointment.status] || statusConfig.agendado;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
        {icon}
        {text}
      </span>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center justify-between">
            <span>Detalhes do Agendamento</span>
            {getStatusBadge()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Cabeçalho com foto e nome do cliente */}
          <div className="flex items-center space-x-4 border-b pb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={appointment.cliente.foto} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {appointment.cliente.nome.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{appointment.cliente.nome}</h3>
              <p className="text-sm text-muted-foreground">
                Agendamento #{appointment.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Detalhes do serviço */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center text-sm text-muted-foreground">
              <Scissors className="h-4 w-4 mr-2" />
              SERVIÇO
            </h4>
            <div className="pl-6">
              <p className="font-medium">{appointment.servico.nome}</p>
              <p className="text-sm text-muted-foreground">
                {appointment.servico.duracao} min • R$ {appointment.servico.preco.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>

          {/* Data e hora */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-2" />
              DATA E HORA
            </h4>
            <div className="pl-6">
              <p className="font-medium">
                {formatDate(appointment.data_hora)} • {formatTime(appointment.data_hora)}
              </p>
            </div>
          </div>

          {/* Profissional */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center text-sm text-muted-foreground">
              <User className="h-4 w-4 mr-2" />
              PROFISSIONAL
            </h4>
            <div className="flex items-center space-x-2 pl-6">
              <Avatar className="h-8 w-8">
                <AvatarImage src={appointment.funcionario.foto} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {appointment.funcionario.nome
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span>{appointment.funcionario.nome}</span>
            </div>
          </div>

          {/* Contato do cliente */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">CONTATO</h4>
            <div className="space-y-2 pl-6">
              {appointment.cliente.telefone && (
                <div className="flex items-center text-sm">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <a 
                    href={`tel:${appointment.cliente.telefone}`} 
                    className="hover:underline hover:text-primary"
                  >
                    {appointment.cliente.telefone}
                  </a>
                </div>
              )}
              {appointment.cliente.email && (
                <div className="flex items-center text-sm">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <a 
                    href={`mailto:${appointment.cliente.email}`} 
                    className="hover:underline hover:text-primary"
                  >
                    {appointment.cliente.email}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          {appointment.observacoes && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">OBSERVAÇÕES</h4>
              <p className="text-sm text-foreground pl-6">{appointment.observacoes}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={() => window.print()}>
            Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
