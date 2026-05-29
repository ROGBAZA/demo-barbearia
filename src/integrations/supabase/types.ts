export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      agendamentos: {
        Row: {
          cliente_id: string
          comissao_funcionario: number | null
          concluido_em: string | null
          created_at: string
          data_hora: string
          forma_pagamento: string | null
          funcionario: string | null
          funcionario_id: string | null
          id: string
          metodo_pagamento: string | null
          observacoes: string | null
          servico_id: string
          status: Database["public"]["Enums"]["status_agendamento"]
          tenant_id: string
          updated_at: string
          valor_cobrado: number | null
          valor_liquido: number | null
        }
        Insert: {
          cliente_id: string
          comissao_funcionario?: number | null
          concluido_em?: string | null
          created_at?: string
          data_hora: string
          forma_pagamento?: string | null
          funcionario?: string | null
          funcionario_id?: string | null
          id?: string
          metodo_pagamento?: string | null
          observacoes?: string | null
          servico_id: string
          status?: Database["public"]["Enums"]["status_agendamento"]
          tenant_id: string
          updated_at?: string
          valor_cobrado?: number | null
          valor_liquido?: number | null
        }
        Update: {
          cliente_id?: string
          comissao_funcionario?: number | null
          concluido_em?: string | null
          created_at?: string
          data_hora?: string
          forma_pagamento?: string | null
          funcionario?: string | null
          funcionario_id?: string | null
          id?: string
          metodo_pagamento?: string | null
          observacoes?: string | null
          servico_id?: string
          status?: Database["public"]["Enums"]["status_agendamento"]
          tenant_id?: string
          updated_at?: string
          valor_cobrado?: number | null
          valor_liquido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assinaturas_clientes: {
        Row: {
          barbas_restantes: number | null
          cliente_id: string | null
          cortes_restantes: number | null
          created_at: string | null
          data_inicio: string | null
          id: string
          plano_id: string | null
          proxima_renovacao: string | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          barbas_restantes?: number | null
          cliente_id?: string | null
          cortes_restantes?: number | null
          created_at?: string | null
          data_inicio?: string | null
          id?: string
          plano_id?: string | null
          proxima_renovacao?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          barbas_restantes?: number | null
          cliente_id?: string | null
          cortes_restantes?: number | null
          created_at?: string | null
          data_inicio?: string | null
          id?: string
          plano_id?: string | null
          proxima_renovacao?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_clientes_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_clientes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          cpf: string | null
          created_at: string
          data_cadastro: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          tenant_id: string
          ultima_visita: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          data_cadastro?: string
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
          tenant_id: string
          ultima_visita?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string
          data_cadastro?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          tenant_id?: string
          ultima_visita?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          banner_url: string | null
          dias_funcionamento: number[]
          email: string | null
          endereco: string | null
          horario_abertura: string
          horario_fechamento: string
          id: string
          logo_url: string | null
          nome_barbearia: string
          telefone: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          dias_funcionamento?: number[]
          email?: string | null
          endereco?: string | null
          horario_abertura?: string
          horario_fechamento?: string
          id?: string
          logo_url?: string | null
          nome_barbearia?: string
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          dias_funcionamento?: number[]
          email?: string | null
          endereco?: string | null
          horario_abertura?: string
          horario_fechamento?: string
          id?: string
          logo_url?: string | null
          nome_barbearia?: string
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fila: {
        Row: {
          barbeiro_id: string | null
          cliente_id: string | null
          criado_em: string | null
          finalizado_em: string | null
          id: string
          posicao: number | null
          status: string | null
          tempo_estimado_minutos: number | null
        }
        Insert: {
          barbeiro_id?: string | null
          cliente_id?: string | null
          criado_em?: string | null
          finalizado_em?: string | null
          id?: string
          posicao?: number | null
          status?: string | null
          tempo_estimado_minutos?: number | null
        }
        Update: {
          barbeiro_id?: string | null
          cliente_id?: string | null
          criado_em?: string | null
          finalizado_em?: string | null
          id?: string
          posicao?: number | null
          status?: string | null
          tempo_estimado_minutos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fila_barbeiro_id_fkey"
            columns: ["barbeiro_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fila_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      fila_espera: {
        Row: {
          barbeiro_id: string | null
          chegada_em: string
          cliente_id: string | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          servico_descricao: string | null
          status: Database["public"]["Enums"]["fila_espera_status"]
          telefone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          barbeiro_id?: string | null
          chegada_em?: string
          cliente_id?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          servico_descricao?: string | null
          status?: Database["public"]["Enums"]["fila_espera_status"]
          telefone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          barbeiro_id?: string | null
          chegada_em?: string
          cliente_id?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          servico_descricao?: string | null
          status?: Database["public"]["Enums"]["fila_espera_status"]
          telefone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fila_espera_barbeiro_id_fkey"
            columns: ["barbeiro_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fila_espera_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fila_espera_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          ativo: boolean
          cargo: Database["public"]["Enums"]["cargo_funcionario"]
          created_at: string
          dias_trabalho: number[] | null
          email: string
          foto_url: string | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          nivel_acesso: Database["public"]["Enums"]["nivel_acesso"]
          nome: string
          status: string | null
          telefone: string | null
          tenant_id: string
          tipo_comissao: Database["public"]["Enums"]["tipo_comissao"]
          updated_at: string
          user_id: string | null
          valor_comissao: number
        }
        Insert: {
          ativo?: boolean
          cargo: Database["public"]["Enums"]["cargo_funcionario"]
          created_at?: string
          dias_trabalho?: number[] | null
          email: string
          foto_url?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          nivel_acesso?: Database["public"]["Enums"]["nivel_acesso"]
          nome: string
          status?: string | null
          telefone?: string | null
          tenant_id: string
          tipo_comissao?: Database["public"]["Enums"]["tipo_comissao"]
          updated_at?: string
          user_id?: string | null
          valor_comissao: number
        }
        Update: {
          ativo?: boolean
          cargo?: Database["public"]["Enums"]["cargo_funcionario"]
          created_at?: string
          dias_trabalho?: number[] | null
          email?: string
          foto_url?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          nivel_acesso?: Database["public"]["Enums"]["nivel_acesso"]
          nome?: string
          status?: string | null
          telefone?: string | null
          tenant_id?: string
          tipo_comissao?: Database["public"]["Enums"]["tipo_comissao"]
          updated_at?: string
          user_id?: string | null
          valor_comissao?: number
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios_backup_old: {
        Row: {
          ativo: boolean
          cargo: string
          created_at: string
          email: string
          id: string
          nivel_acesso: string
          nome: string
          telefone: string | null
          tipo_comissao: string
          updated_at: string
          user_id: string | null
          valor_comissao: number
        }
        Insert: {
          ativo?: boolean
          cargo: string
          created_at?: string
          email: string
          id?: string
          nivel_acesso?: string
          nome: string
          telefone?: string | null
          tipo_comissao?: string
          updated_at?: string
          user_id?: string | null
          valor_comissao?: number
        }
        Update: {
          ativo?: boolean
          cargo?: string
          created_at?: string
          email?: string
          id?: string
          nivel_acesso?: string
          nome?: string
          telefone?: string | null
          tipo_comissao?: string
          updated_at?: string
          user_id?: string | null
          valor_comissao?: number
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          lida: boolean | null
          mensagem: string
          tenant_id: string
          tipo: string
          titulo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          lida?: boolean | null
          mensagem: string
          tenant_id: string
          tipo: string
          titulo: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          lida?: boolean | null
          mensagem?: string
          tenant_id?: string
          tipo?: string
          titulo?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          created_at: string | null
          descricao: string | null
          duracao_meses: number | null
          id: string
          limite_barbas: number | null
          limite_cortes: number | null
          nome: string
          preco: number
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          duracao_meses?: number | null
          id?: string
          limite_barbas?: number | null
          limite_cortes?: number | null
          nome: string
          preco: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          duracao_meses?: number | null
          id?: string
          limite_barbas?: number | null
          limite_cortes?: number | null
          nome?: string
          preco?: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          created_at: string
          duracao_minutos: number
          foto_url: string | null
          id: string
          nome: string
          preco: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duracao_minutos: number
          foto_url?: string | null
          id?: string
          nome: string
          preco: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duracao_minutos?: number
          foto_url?: string | null
          id?: string
          nome?: string
          preco?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_settings: {
        Row: {
          created_at: string | null
          id: string
          key_name: string
          key_value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key_name: string
          key_value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key_name?: string
          key_value?: string
        }
        Relationships: []
      }
      super_admins: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          email: string
          id: string
          nome: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          nome: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tenant_audit_log: {
        Row: {
          action: string
          changed_by: string | null
          changes: Json | null
          created_at: string | null
          id: string
          tenant_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          changes?: Json | null
          created_at?: string | null
          id?: string
          tenant_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          changes?: Json | null
          created_at?: string | null
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          antecedencia_minima_horas: number | null
          created_at: string | null
          dias_funcionamento: number[] | null
          email: string | null
          endereco: string | null
          horario_abertura: string | null
          horario_fechamento: string | null
          id: string
          intervalo_agendamento: number | null
          mensagem_boas_vindas: string | null
          nome_barbearia: string | null
          politica_privacidade: string | null
          telefone: string | null
          tenant_id: string | null
          termos_servico: string | null
        }
        Insert: {
          antecedencia_minima_horas?: number | null
          created_at?: string | null
          dias_funcionamento?: number[] | null
          email?: string | null
          endereco?: string | null
          horario_abertura?: string | null
          horario_fechamento?: string | null
          id?: string
          intervalo_agendamento?: number | null
          mensagem_boas_vindas?: string | null
          nome_barbearia?: string | null
          politica_privacidade?: string | null
          telefone?: string | null
          tenant_id?: string | null
          termos_servico?: string | null
        }
        Update: {
          antecedencia_minima_horas?: number | null
          created_at?: string | null
          dias_funcionamento?: number[] | null
          email?: string | null
          endereco?: string | null
          horario_abertura?: string | null
          horario_fechamento?: string | null
          id?: string
          intervalo_agendamento?: number | null
          mensagem_boas_vindas?: string | null
          nome_barbearia?: string | null
          politica_privacidade?: string | null
          telefone?: string | null
          tenant_id?: string | null
          termos_servico?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          ativo: boolean | null
          banner_url: string | null
          cor_fundo: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string | null
          dias_funcionamento: number[] | null
          endereco: string | null
          fonte_primaria: string | null
          horario_abertura: string | null
          horario_fechamento: string | null
          horario_funcionamento: Json | null
          id: string
          logo_url: string | null
          max_employees: number | null
          nome: string
          owner_id: string | null
          plano: string | null
          slug: string
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean | null
          banner_url?: string | null
          cor_fundo?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          dias_funcionamento?: number[] | null
          endereco?: string | null
          fonte_primaria?: string | null
          horario_abertura?: string | null
          horario_fechamento?: string | null
          horario_funcionamento?: Json | null
          id?: string
          logo_url?: string | null
          max_employees?: number | null
          nome: string
          owner_id?: string | null
          plano?: string | null
          slug: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean | null
          banner_url?: string | null
          cor_fundo?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          dias_funcionamento?: number[] | null
          endereco?: string | null
          fonte_primaria?: string | null
          horario_abertura?: string | null
          horario_fechamento?: string | null
          horario_funcionamento?: Json | null
          id?: string
          logo_url?: string | null
          max_employees?: number | null
          nome?: string
          owner_id?: string | null
          plano?: string | null
          slug?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_agendamento_public: {
        Args: {
          p_cliente_id: string
          p_data_hora: string
          p_funcionario_id: string
          p_observacoes?: string
          p_servico_id: string
          p_tenant_id: string
        }
        Returns: string
      }
      create_new_tenant_wizard: {
        Args: {
          _email: string
          _nome_barbearia: string
          _nome_dono: string
          _slug: string
        }
        Returns: Json
      }
      current_funcionario_id: { Args: never; Returns: string }
      current_funcionario_level: { Args: never; Returns: string }
      current_user_has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      get_auth_tenant_id: { Args: never; Returns: string }
      get_booked_slots: {
        Args: {
          data_fim: string
          data_inicio: string
          funcionario_uuid: string
        }
        Returns: {
          data_hora: string
        }[]
      }
      get_current_user_access_level: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      get_fila_publica_v2: { Args: { p_tenant_id: string }; Returns: Json }
      get_or_create_client_public: {
        Args: {
          p_email?: string
          p_nome: string
          p_telefone: string
          p_tenant_id: string
          p_user_id?: string
        }
        Returns: string
      }
      get_public_barbeiros: {
        Args: { t_id: string }
        Returns: {
          dias_trabalho: number[]
          foto_url: string
          horario_fim: string
          horario_inicio: string
          id: string
          nome: string
        }[]
      }
      get_public_config: {
        Args: { t_id: string }
        Returns: {
          banner_url: string
          dias_funcionamento: number[]
          email: string
          endereco: string
          horario_abertura: string
          horario_fechamento: string
          id: string
          logo_url: string
          nome_barbearia: string
          telefone: string
        }[]
      }
      get_public_servicos: {
        Args: { t_id: string }
        Returns: {
          categoria: string
          descricao: string
          duracao_minutos: number
          id: string
          imagem_url: string
          nome: string
          preco: number
        }[]
      }
      get_queue_public: {
        Args: { t_id: string }
        Returns: {
          chegada_em: string
          id: string
          nome: string
          servico_descricao: string
          status: string
          updated_at: string
        }[]
      }
      get_super_admin_stats: { Args: never; Returns: Json }
      get_tenant_config: {
        Args: { t_id: string }
        Returns: {
          antecedencia_minima_horas: number | null
          created_at: string | null
          dias_funcionamento: number[] | null
          email: string | null
          endereco: string | null
          horario_abertura: string | null
          horario_fechamento: string | null
          id: string
          intervalo_agendamento: number | null
          mensagem_boas_vindas: string | null
          nome_barbearia: string | null
          politica_privacidade: string | null
          telefone: string | null
          tenant_id: string | null
          termos_servico: string | null
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      join_queue_public:
      | {
        Args: {
          p_nome: string
          p_servico: string
          p_telefone: string
          p_tenant_id: string
        }
        Returns: string
      }
      | {
        Args: {
          p_barbeiro_id?: string
          p_cpf?: string
          p_email?: string
          p_nome: string
          p_observacoes?: string
          p_servico?: string
          p_telefone: string
          p_tenant_id: string
        }
        Returns: string
      }
      marcar_todas_notificacoes_lidas: {
        Args: { user_uuid: string }
        Returns: number
      }
      promote_first_user_to_admin: { Args: never; Returns: undefined }
      promote_user_to_admin_by_email: {
        Args: { user_email: string }
        Returns: string
      }
      simulate_subscription_success: {
        Args: { _new_limit: number; _tenant_id: string }
        Returns: Json
      }
      upsert_tenant_config: {
        Args: {
          _banner_url?: string
          _cor_primaria?: string
          _cor_secundaria?: string
          _dias_funcionamento?: number[]
          _email?: string
          _endereco?: string
          _fonte_primaria?: string
          _horario_abertura?: string
          _horario_fechamento?: string
          _logo_url?: string
          _nome_barbearia: string
          _telefone?: string
          _tenant_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
      | "admin"
      | "gerente"
      | "recepcionista"
      | "funcionario"
      | "cliente"
      cargo_funcionario: "barbeiro" | "recepcao" | "auxiliar" | "gerente"
      fila_espera_status:
      | "aguardando"
      | "chamado"
      | "em_atendimento"
      | "atendido"
      | "cancelado"
      nivel_acesso: "funcionario" | "administrador" | "recepcionista"
      status_agendamento: "agendado" | "concluido" | "cancelado" | "chamado"
      tipo_comissao: "percentual" | "valor_fixo"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gerente", "recepcionista", "funcionario", "cliente"],
      cargo_funcionario: ["barbeiro", "recepcao", "auxiliar", "gerente"],
      fila_espera_status: [
        "aguardando",
        "chamado",
        "em_atendimento",
        "atendido",
        "cancelado",
      ],
      nivel_acesso: ["funcionario", "administrador", "recepcionista"],
      status_agendamento: ["agendado", "concluido", "cancelado", "chamado"],
      tipo_comissao: ["percentual", "valor_fixo"],
    },
  },
} as const
