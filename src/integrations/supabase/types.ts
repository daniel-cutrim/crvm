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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      _webhook_debug: {
        Row: {
          created_at: string | null
          decision: string | null
          id: string
          parsed: Json | null
          raw_payload: Json | null
        }
        Insert: {
          created_at?: string | null
          decision?: string | null
          id?: string
          parsed?: Json | null
          raw_payload?: Json | null
        }
        Update: {
          created_at?: string | null
          decision?: string | null
          id?: string
          parsed?: Json | null
          raw_payload?: Json | null
        }
        Relationships: []
      }
      auth_google_agenda: {
        Row: {
          access_token: string
          clinica_id: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          refresh_token: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          clinica_id?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          refresh_token?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          clinica_id?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          refresh_token?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auth_google_agenda_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
        ]
      }
      automacao_mensagens: {
        Row: {
          clinica_id: string | null
          conversa_id: string | null
          created_at: string | null
          enviada_at: string
          id: string
          phone: string | null
          referencia_id: string | null
          respondida_at: string | null
          resposta: string | null
          tipo: string
        }
        Insert: {
          clinica_id?: string | null
          conversa_id?: string | null
          created_at?: string | null
          enviada_at?: string
          id?: string
          phone?: string | null
          referencia_id?: string | null
          respondida_at?: string | null
          resposta?: string | null
          tipo: string
        }
        Update: {
          clinica_id?: string | null
          conversa_id?: string | null
          created_at?: string | null
          enviada_at?: string
          id?: string
          phone?: string | null
          referencia_id?: string | null
          respondida_at?: string | null
          resposta?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "automacao_mensagens_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversas: {
        Row: {
          chat_lid: string | null
          clinica_id: string | null
          created_at: string | null
          crm_etapa_funil: string | null
          crm_interesse: string | null
          crm_nome: string | null
          crm_objecoes: string | null
          crm_preferencia_horario: string | null
          crm_preferencia_modalidade: string | null
          crm_problemas_identificados: string | null
          crm_resumo_geral: string | null
          crm_telefone: string | null
          crm_urgencia: string | null
          extraction_pending: boolean | null
          foto_url: string | null
          id: string
          instance_id: string | null
          lead_id: string | null
          nao_lidas: number | null
          nome: string
          paciente_id: string | null
          phone: string
          setor_id: string | null
          supervisor_enabled: boolean | null
          supervisor_guidance: string | null
          supervisor_guidance_at: string | null
          ultima_mensagem: string | null
          ultima_mensagem_at: string | null
        }
        Insert: {
          chat_lid?: string | null
          clinica_id?: string | null
          created_at?: string | null
          crm_etapa_funil?: string | null
          crm_interesse?: string | null
          crm_nome?: string | null
          crm_objecoes?: string | null
          crm_preferencia_horario?: string | null
          crm_preferencia_modalidade?: string | null
          crm_problemas_identificados?: string | null
          crm_resumo_geral?: string | null
          crm_telefone?: string | null
          crm_urgencia?: string | null
          extraction_pending?: boolean | null
          foto_url?: string | null
          id?: string
          instance_id?: string | null
          lead_id?: string | null
          nao_lidas?: number | null
          nome: string
          paciente_id?: string | null
          phone: string
          setor_id?: string | null
          supervisor_enabled?: boolean | null
          supervisor_guidance?: string | null
          supervisor_guidance_at?: string | null
          ultima_mensagem?: string | null
          ultima_mensagem_at?: string | null
        }
        Update: {
          chat_lid?: string | null
          clinica_id?: string | null
          created_at?: string | null
          crm_etapa_funil?: string | null
          crm_interesse?: string | null
          crm_nome?: string | null
          crm_objecoes?: string | null
          crm_preferencia_horario?: string | null
          crm_preferencia_modalidade?: string | null
          crm_problemas_identificados?: string | null
          crm_resumo_geral?: string | null
          crm_telefone?: string | null
          crm_urgencia?: string | null
          extraction_pending?: boolean | null
          foto_url?: string | null
          id?: string
          instance_id?: string | null
          lead_id?: string | null
          nao_lidas?: number | null
          nome?: string
          paciente_id?: string | null
          phone?: string
          setor_id?: string | null
          supervisor_enabled?: boolean | null
          supervisor_guidance?: string | null
          supervisor_guidance_at?: string | null
          ultima_mensagem?: string | null
          ultima_mensagem_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversas_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversas_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_mensagens: {
        Row: {
          clinica_id: string | null
          conteudo: string | null
          conversa_id: string
          created_at: string | null
          from_me: boolean
          id: string
          media_mime_type: string | null
          media_url: string | null
          message_id: string | null
          status: string | null
          timestamp: string
          tipo: string
          zapi_moment: number | null
        }
        Insert: {
          clinica_id?: string | null
          conteudo?: string | null
          conversa_id: string
          created_at?: string | null
          from_me?: boolean
          id?: string
          media_mime_type?: string | null
          media_url?: string | null
          message_id?: string | null
          status?: string | null
          timestamp?: string
          tipo?: string
          zapi_moment?: number | null
        }
        Update: {
          clinica_id?: string | null
          conteudo?: string | null
          conversa_id?: string
          created_at?: string | null
          from_me?: boolean
          id?: string
          media_mime_type?: string | null
          media_url?: string | null
          message_id?: string | null
          status?: string | null
          timestamp?: string
          tipo?: string
          zapi_moment?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_mensagens_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "chat_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_modelos_mensagem: {
        Row: {
          atalho: string | null
          categoria: string | null
          clinica_id: string | null
          conteudo: string
          created_at: string | null
          id: string
          titulo: string
        }
        Insert: {
          atalho?: string | null
          categoria?: string | null
          clinica_id?: string | null
          conteudo: string
          created_at?: string | null
          id?: string
          titulo: string
        }
        Update: {
          atalho?: string | null
          categoria?: string | null
          clinica_id?: string | null
          conteudo?: string
          created_at?: string | null
          id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_modelos_mensagem_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
        ]
      }
      clinica: {
        Row: {
          cnpj: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string | null
          dominio: string | null
          email: string | null
          endereco: string | null
          id: string
          logo_url: string | null
          nome: string
          telefone: string | null
        }
        Insert: {
          cnpj?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          dominio?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          telefone?: string | null
        }
        Update: {
          cnpj?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          dominio?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      consultas: {
        Row: {
          clinica_id: string | null
          created_at: string | null
          data_hora: string
          dentista_id: string
          duracao_minutos: number
          google_event_id: string | null
          id: string
          lead_id: string | null
          observacoes: string | null
          paciente_id: string | null
          sala: string | null
          status: string
          tipo_procedimento: string
        }
        Insert: {
          clinica_id?: string | null
          created_at?: string | null
          data_hora: string
          dentista_id: string
          duracao_minutos?: number
          google_event_id?: string | null
          id?: string
          lead_id?: string | null
          observacoes?: string | null
          paciente_id?: string | null
          sala?: string | null
          status?: string
          tipo_procedimento: string
        }
        Update: {
          clinica_id?: string | null
          created_at?: string | null
          data_hora?: string
          dentista_id?: string
          duracao_minutos?: number
          google_event_id?: string | null
          id?: string
          lead_id?: string | null
          observacoes?: string | null
          paciente_id?: string | null
          sala?: string | null
          status?: string
          tipo_procedimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultas_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_dentista_id_fkey"
            columns: ["dentista_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas: {
        Row: {
          categoria: string
          clinica_id: string | null
          created_at: string | null
          data: string
          descricao: string
          id: string
          valor: number
        }
        Insert: {
          categoria: string
          clinica_id?: string | null
          created_at?: string | null
          data: string
          descricao: string
          id?: string
          valor: number
        }
        Update: {
          categoria?: string
          clinica_id?: string | null
          created_at?: string | null
          data?: string
          descricao?: string
          id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas_recorrentes: {
        Row: {
          ativo: boolean
          categoria: string
          clinica_id: string | null
          created_at: string | null
          descricao: string
          dia_vencimento: number
          id: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          clinica_id?: string | null
          created_at?: string | null
          descricao: string
          dia_vencimento?: number
          id?: string
          valor?: number
        }
        Update: {
          ativo?: boolean
          categoria?: string
          clinica_id?: string | null
          created_at?: string | null
          descricao?: string
          dia_vencimento?: number
          id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_recorrentes_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
        ]
      }
      funil_etapas: {
        Row: {
          clinica_id: string | null
          cor: string | null
          created_at: string
          funil_id: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          clinica_id?: string | null
          cor?: string | null
          created_at?: string
          funil_id: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          clinica_id?: string | null
          cor?: string | null
          created_at?: string
          funil_id?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funil_etapas_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funil_etapas_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
        ]
      }
      funis: {
        Row: {
          clinica_id: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          setor_id: string | null
          updated_at: string
        }
        Insert: {
          clinica_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          setor_id?: string | null
          updated_at?: string
        }
        Update: {
          clinica_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          setor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funis_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funis_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      integracoes: {
        Row: {
          ativo: boolean | null
          clinica_id: string
          created_at: string
          credentials: Json
          id: string
          setor_id: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          clinica_id: string
          created_at?: string
          credentials?: Json
          id?: string
          setor_id?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          clinica_id?: string
          created_at?: string
          credentials?: Json
          id?: string
          setor_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integracoes_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integracoes_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_jornada: {
        Row: {
          ad_id: string | null
          ad_name: string | null
          campaign_name: string | null
          clinica_id: string
          created_at: string | null
          descricao: string | null
          id: string
          lead_id: string
          plataforma: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          ad_id?: string | null
          ad_name?: string | null
          campaign_name?: string | null
          clinica_id: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          lead_id: string
          plataforma: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          ad_id?: string | null
          ad_name?: string | null
          campaign_name?: string | null
          clinica_id?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          lead_id?: string
          plataforma?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_jornada_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_jornada_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          clinica_id: string | null
          convertido_paciente_id: string | null
          created_at: string | null
          email: string | null
          etapa_funil: string
          etapa_id: string | null
          funil_id: string | null
          id: string
          interesse: string | null
          nome: string
          origem: string | null
          proxima_acao_data: string | null
          proxima_acao_tipo: string | null
          setor_id: string | null
          telefone: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          clinica_id?: string | null
          convertido_paciente_id?: string | null
          created_at?: string | null
          email?: string | null
          etapa_funil?: string
          etapa_id?: string | null
          funil_id?: string | null
          id?: string
          interesse?: string | null
          nome: string
          origem?: string | null
          proxima_acao_data?: string | null
          proxima_acao_tipo?: string | null
          setor_id?: string | null
          telefone?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          clinica_id?: string | null
          convertido_paciente_id?: string | null
          created_at?: string | null
          email?: string | null
          etapa_funil?: string
          etapa_id?: string | null
          funil_id?: string | null
          id?: string
          interesse?: string | null
          nome?: string
          origem?: string | null
          proxima_acao_data?: string | null
          proxima_acao_tipo?: string | null
          setor_id?: string | null
          telefone?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_convertido_paciente_id_fkey"
            columns: ["convertido_paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "funil_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_historico: {
        Row: {
          clinica_id: string | null
          created_at: string | null
          descricao: string
          id: string
          lead_id: string
          tipo_contato: string
          usuario_id: string | null
        }
        Insert: {
          clinica_id?: string | null
          created_at?: string | null
          descricao: string
          id?: string
          lead_id: string
          tipo_contato: string
          usuario_id?: string | null
        }
        Update: {
          clinica_id?: string | null
          created_at?: string | null
          descricao?: string
          id?: string
          lead_id?: string
          tipo_contato?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_historico_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_historico_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_historico_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_investimentos: {
        Row: {
          canal: string
          clinica_id: string | null
          created_at: string | null
          id: string
          mes: string
          observacao: string | null
          valor_investido: number
        }
        Insert: {
          canal: string
          clinica_id?: string | null
          created_at?: string | null
          id?: string
          mes: string
          observacao?: string | null
          valor_investido?: number
        }
        Update: {
          canal?: string
          clinica_id?: string | null
          created_at?: string | null
          id?: string
          mes?: string
          observacao?: string | null
          valor_investido?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketing_investimentos_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_metas: {
        Row: {
          clinica_id: string | null
          created_at: string | null
          id: string
          mes: string
          meta_conversoes: number
          meta_leads: number
          meta_roi: number | null
        }
        Insert: {
          clinica_id?: string | null
          created_at?: string | null
          id?: string
          mes: string
          meta_conversoes?: number
          meta_leads?: number
          meta_roi?: number | null
        }
        Update: {
          clinica_id?: string | null
          created_at?: string | null
          id?: string
          mes?: string
          meta_conversoes?: number
          meta_leads?: number
          meta_roi?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_metas_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          ativo: boolean | null
          clinica_id: string | null
          created_at: string | null
          email_destino: string | null
          id: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          clinica_id?: string | null
          created_at?: string | null
          email_destino?: string | null
          id?: string
          tipo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          clinica_id?: string | null
          created_at?: string | null
          email_destino?: string | null
          id?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
        ]
      }
      odontograma_entradas: {
        Row: {
          clinica_id: string | null
          created_at: string | null
          data_registro: string
          dente_numero: number
          dentista_id: string | null
          face: string
          id: string
          observacao: string | null
          paciente_id: string
          procedimento: string | null
          status: string
        }
        Insert: {
          clinica_id?: string | null
          created_at?: string | null
          data_registro?: string
          dente_numero: number
          dentista_id?: string | null
          face?: string
          id?: string
          observacao?: string | null
          paciente_id: string
          procedimento?: string | null
          status?: string
        }
        Update: {
          clinica_id?: string | null
          created_at?: string | null
          data_registro?: string
          dente_numero?: number
          dentista_id?: string | null
          face?: string
          id?: string
          observacao?: string | null
          paciente_id?: string
          procedimento?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "odontograma_entradas_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "odontograma_entradas_dentista_id_fkey"
            columns: ["dentista_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "odontograma_entradas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      paciente_documentos: {
        Row: {
          clinica_id: string | null
          created_at: string | null
          descricao: string | null
          id: string
          nome_arquivo: string
          paciente_id: string
          storage_path: string
          tamanho_bytes: number
          tipo_documento: string
          tipo_mime: string
          usuario_upload_id: string | null
        }
        Insert: {
          clinica_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome_arquivo: string
          paciente_id: string
          storage_path: string
          tamanho_bytes: number
          tipo_documento: string
          tipo_mime: string
          usuario_upload_id?: string | null
        }
        Update: {
          clinica_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome_arquivo?: string
          paciente_id?: string
          storage_path?: string
          tamanho_bytes?: number
          tipo_documento?: string
          tipo_mime?: string
          usuario_upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paciente_documentos_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paciente_documentos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paciente_documentos_usuario_upload_id_fkey"
            columns: ["usuario_upload_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      pacientes: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          clinica_id: string | null
          codigo_paciente: string | null
          complemento: string | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string | null
          dentista_id: string | null
          email: string | null
          estado: string | null
          id: string
          informacoes_clinicas: string | null
          nome: string
          numero: string | null
          rua: string | null
          sexo: string | null
          status: string
          telefone: string | null
          whatsapp: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          clinica_id?: string | null
          codigo_paciente?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          dentista_id?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          informacoes_clinicas?: string | null
          nome: string
          numero?: string | null
          rua?: string | null
          sexo?: string | null
          status?: string
          telefone?: string | null
          whatsapp?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          clinica_id?: string | null
          codigo_paciente?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          dentista_id?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          informacoes_clinicas?: string | null
          nome?: string
          numero?: string | null
          rua?: string | null
          sexo?: string | null
          status?: string
          telefone?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pacientes_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pacientes_dentista_id_fkey"
            columns: ["dentista_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_tratamento: {
        Row: {
          clinica_id: string | null
          created_at: string | null
          dentista_id: string
          entrada_sugerida: number | null
          forma_pagamento: string | null
          id: string
          numero_parcelas: number | null
          observacoes: string | null
          paciente_id: string
          status: string
          valor_total: number
        }
        Insert: {
          clinica_id?: string | null
          created_at?: string | null
          dentista_id: string
          entrada_sugerida?: number | null
          forma_pagamento?: string | null
          id?: string
          numero_parcelas?: number | null
          observacoes?: string | null
          paciente_id: string
          status?: string
          valor_total?: number
        }
        Update: {
          clinica_id?: string | null
          created_at?: string | null
          dentista_id?: string
          entrada_sugerida?: number | null
          forma_pagamento?: string | null
          id?: string
          numero_parcelas?: number | null
          observacoes?: string | null
          paciente_id?: string
          status?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "planos_tratamento_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_tratamento_dentista_id_fkey"
            columns: ["dentista_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_tratamento_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_tratamento_itens: {
        Row: {
          aprovado: boolean
          clinica_id: string | null
          created_at: string | null
          dente_regiao: string | null
          id: string
          plano_id: string
          procedimento_nome: string
          quantidade: number
          quantidade_aprovada: number
          valor_unitario: number
        }
        Insert: {
          aprovado?: boolean
          clinica_id?: string | null
          created_at?: string | null
          dente_regiao?: string | null
          id?: string
          plano_id: string
          procedimento_nome: string
          quantidade?: number
          quantidade_aprovada?: number
          valor_unitario?: number
        }
        Update: {
          aprovado?: boolean
          clinica_id?: string | null
          created_at?: string | null
          dente_regiao?: string | null
          id?: string
          plano_id?: string
          procedimento_nome?: string
          quantidade?: number
          quantidade_aprovada?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "planos_tratamento_itens_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_tratamento_itens_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_tratamento"
            referencedColumns: ["id"]
          },
        ]
      }
      procedimentos_padrao: {
        Row: {
          ativo: boolean | null
          clinica_id: string | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          valor_base: number
        }
        Insert: {
          ativo?: boolean | null
          clinica_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          valor_base?: number
        }
        Update: {
          ativo?: boolean | null
          clinica_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          valor_base?: number
        }
        Relationships: [
          {
            foreignKeyName: "procedimentos_padrao_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
        ]
      }
      prontuario_entradas: {
        Row: {
          clinica_id: string | null
          created_at: string | null
          data_registro: string
          dentista_id: string | null
          descricao: string | null
          id: string
          paciente_id: string
          tipo: string
          titulo: string
        }
        Insert: {
          clinica_id?: string | null
          created_at?: string | null
          data_registro?: string
          dentista_id?: string | null
          descricao?: string | null
          id?: string
          paciente_id: string
          tipo?: string
          titulo: string
        }
        Update: {
          clinica_id?: string | null
          created_at?: string | null
          data_registro?: string
          dentista_id?: string | null
          descricao?: string | null
          id?: string
          paciente_id?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "prontuario_entradas_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prontuario_entradas_dentista_id_fkey"
            columns: ["dentista_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prontuario_entradas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      receitas: {
        Row: {
          clinica_id: string | null
          created_at: string | null
          data: string
          forma_pagamento: string
          id: string
          paciente_id: string
          plano_id: string | null
          procedimento: string | null
          status: string
          valor: number
        }
        Insert: {
          clinica_id?: string | null
          created_at?: string | null
          data: string
          forma_pagamento: string
          id?: string
          paciente_id: string
          plano_id?: string | null
          procedimento?: string | null
          status?: string
          valor: number
        }
        Update: {
          clinica_id?: string | null
          created_at?: string | null
          data?: string
          forma_pagamento?: string
          id?: string
          paciente_id?: string
          plano_id?: string | null
          procedimento?: string | null
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "receitas_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receitas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receitas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_tratamento"
            referencedColumns: ["id"]
          },
        ]
      }
      setores: {
        Row: {
          clinica_id: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          clinica_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          clinica_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setores_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          acao: string
          clinica_id: string | null
          created_at: string | null
          detalhes: Json | null
          id: string
          nivel: string | null
          registro_id: string | null
          tabela: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          clinica_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          nivel?: string | null
          registro_id?: string | null
          tabela?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          clinica_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          nivel?: string | null
          registro_id?: string | null
          tabela?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_logs_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          clinica_id: string | null
          created_at: string | null
          data_vencimento: string
          descricao: string
          id: string
          lead_id: string | null
          paciente_id: string | null
          responsavel_id: string | null
          status: string
        }
        Insert: {
          clinica_id?: string | null
          created_at?: string | null
          data_vencimento: string
          descricao: string
          id?: string
          lead_id?: string | null
          paciente_id?: string | null
          responsavel_id?: string | null
          status?: string
        }
        Update: {
          clinica_id?: string | null
          created_at?: string | null
          data_vencimento?: string
          descricao?: string
          id?: string
          lead_id?: string | null
          paciente_id?: string | null
          responsavel_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_setores: {
        Row: {
          created_at: string
          id: string
          setor_id: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          setor_id: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          setor_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_setores_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_setores_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean | null
          auth_user_id: string | null
          clinica_id: string | null
          created_at: string | null
          email: string
          id: string
          nome: string
          papel: string
        }
        Insert: {
          ativo?: boolean | null
          auth_user_id?: string | null
          clinica_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          nome: string
          papel: string
        }
        Update: {
          ativo?: boolean | null
          auth_user_id?: string | null
          clinica_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          papel?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinica"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_clinica_id: { Args: never; Returns: string }
      get_user_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      is_dentista: { Args: never; Returns: boolean }
      is_gestor: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
