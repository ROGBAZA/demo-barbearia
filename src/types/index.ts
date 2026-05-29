export interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
  imagem_url?: string | null;
  descricao?: string | null;
  categoria?: string | null;
}

export interface Barbeiro {
  id: string;
  nome: string;
  cargo: string;
  horario_inicio: string;
  horario_fim: string;
  dias_trabalho: number[];
  foto_url?: string | null;
}

export interface Configuracao {
  id: string;
  nome_barbearia: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  logo_url?: string;
  banner_url?: string;
  horario_abertura: string;
  horario_fechamento: string;
  dias_funcionamento: number[];
}

export interface ClienteData {
  nome: string;
  telefone: string;
  email: string;
}

export interface FilaEsperaEntry {
  id: string;
  cliente_id?: string | null;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  cpf?: string | null;
  barbeiro_id?: string | null;
  servico_descricao?: string | null;
  observacoes?: string | null;
  status: 'aguardando' | 'em_atendimento' | 'atendido' | 'cancelado' | 'chamado';
  chegada_em: string;
  created_at: string;
  updated_at: string;
}
