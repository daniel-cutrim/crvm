-- ============================================================
-- CRM ODONTO - MIGRAÇÃO COMPLETA DO BANCO DE DADOS
-- Projeto: MedRoi 01 (wdtwysjfusehzmzlfkaj)
-- PostgreSQL 17 | Supabase
-- Gerado em: 2026-05-09
-- ============================================================
-- ORDEM DE EXECUÇÃO:
--   1. Extensões
--   2. Sequências
--   3. Tabelas (ordem de dependência)
--   4. Funções
--   5. Triggers (auth + public)
--   6. RLS Policies
--   7. Índices
--   8. Storage Buckets + Policies
--   9. Realtime Publications
-- ============================================================

-- ============================================================
-- PARTE 1: EXTENSÕES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;
-- pg_cron e supabase_vault são gerenciados pelo Supabase automaticamente

-- ============================================================
-- PARTE 2: SEQUÊNCIAS
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS public.pacientes_codigo_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.paciente_codigo_seq START 1;
-- Ajustar valor atual após migração de dados:
-- SELECT setval('public.paciente_codigo_seq', 3);

-- ============================================================
-- PARTE 3: TABELAS (ordem de dependência)
-- ============================================================

-- 3.1 CLINICA (tabela raiz - tenant principal)
CREATE TABLE IF NOT EXISTS public.clinica (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL DEFAULT 'F&F Odonto',
  cnpj text,
  endereco text,
  telefone text,
  email text,
  created_at timestamptz DEFAULT now(),
  logo_url text,
  cor_primaria text DEFAULT '199 89% 38%',
  cor_secundaria text DEFAULT '199 89% 28%',
  dominio text
);
ALTER TABLE public.clinica ENABLE ROW LEVEL SECURITY;

-- 3.2 USUARIOS
CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid,
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  papel text NOT NULL CHECK (papel = ANY (ARRAY['Recepção','Dentista','Gestor','Gestor/Dentista'])),
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  clinica_id uuid REFERENCES public.clinica(id)
);
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- 3.3 SETORES
CREATE TABLE IF NOT EXISTS public.setores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES public.clinica(id),
  nome text NOT NULL,
  descricao text,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;

-- 3.4 USUARIO_SETORES (N:N)
CREATE TABLE IF NOT EXISTS public.usuario_setores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id),
  setor_id uuid NOT NULL REFERENCES public.setores(id),
  created_at timestamptz DEFAULT timezone('utc', now()),
  UNIQUE (usuario_id, setor_id)
);
ALTER TABLE public.usuario_setores ENABLE ROW LEVEL SECURITY;

-- 3.5 PACIENTES
CREATE TABLE IF NOT EXISTS public.pacientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf text,
  data_nascimento date,
  sexo text CHECK (sexo = ANY (ARRAY['Masculino','Feminino','Outro'])),
  telefone text,
  whatsapp text,
  email text,
  cep text,
  rua text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  informacoes_clinicas text,
  dentista_id uuid REFERENCES public.usuarios(id),
  status text NOT NULL DEFAULT 'Ativo' CHECK (status = ANY (ARRAY['Ativo','Em tratamento','Inadimplente','Inativo'])),
  created_at timestamptz DEFAULT now(),
  codigo_paciente text UNIQUE,
  clinica_id uuid REFERENCES public.clinica(id)
);
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

-- 3.6 FUNIS
CREATE TABLE IF NOT EXISTS public.funis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES public.clinica(id),
  setor_id uuid REFERENCES public.setores(id),
  nome text NOT NULL,
  descricao text,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);
ALTER TABLE public.funis ENABLE ROW LEVEL SECURITY;

-- 3.7 FUNIL_ETAPAS
CREATE TABLE IF NOT EXISTS public.funil_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funil_id uuid NOT NULL REFERENCES public.funis(id),
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  cor text,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now()),
  clinica_id uuid REFERENCES public.clinica(id)
);
ALTER TABLE public.funil_etapas ENABLE ROW LEVEL SECURITY;

-- 3.8 LEADS
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text,
  email text,
  origem text CHECK (origem = ANY (ARRAY['Instagram','Google Ads','Indicação','Site','Facebook','WhatsApp','Outro'])),
  interesse text,
  etapa_funil text NOT NULL DEFAULT 'Novo Lead',
  proxima_acao_data date,
  proxima_acao_tipo text,
  convertido_paciente_id uuid REFERENCES public.pacientes(id),
  created_at timestamptz DEFAULT now(),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  clinica_id uuid REFERENCES public.clinica(id),
  setor_id uuid REFERENCES public.setores(id),
  funil_id uuid REFERENCES public.funis(id),
  etapa_id uuid REFERENCES public.funil_etapas(id)
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 3.9 LEAD_JORNADA
CREATE TABLE IF NOT EXISTS public.lead_jornada (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  lead_id uuid NOT NULL REFERENCES public.leads(id),
  clinica_id uuid NOT NULL REFERENCES public.clinica(id),
  plataforma varchar NOT NULL,
  utm_source varchar,
  utm_medium varchar,
  utm_campaign varchar,
  ad_id varchar,
  ad_name varchar,
  campaign_name varchar,
  descricao text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.lead_jornada ENABLE ROW LEVEL SECURITY;

-- 3.10 LEADS_HISTORICO
CREATE TABLE IF NOT EXISTS public.leads_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id),
  tipo_contato text NOT NULL CHECK (tipo_contato = ANY (ARRAY['Ligação','WhatsApp','E-mail','Visita','Outro'])),
  descricao text NOT NULL,
  usuario_id uuid REFERENCES public.usuarios(id),
  created_at timestamptz DEFAULT now(),
  clinica_id uuid REFERENCES public.clinica(id)
);
ALTER TABLE public.leads_historico ENABLE ROW LEVEL SECURITY;

-- 3.11 CONSULTAS
CREATE TABLE IF NOT EXISTS public.consultas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid REFERENCES public.pacientes(id),
  lead_id uuid REFERENCES public.leads(id),
  dentista_id uuid NOT NULL REFERENCES public.usuarios(id),
  data_hora timestamptz NOT NULL,
  duracao_minutos integer NOT NULL DEFAULT 30,
  tipo_procedimento text NOT NULL,
  status text NOT NULL DEFAULT 'Agendada' CHECK (status = ANY (ARRAY['Agendada','Confirmada','Compareceu','Faltou','Cancelada'])),
  sala text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  clinica_id uuid REFERENCES public.clinica(id),
  google_event_id text
);
ALTER TABLE public.consultas ENABLE ROW LEVEL SECURITY;

-- 3.12 PLANOS_TRATAMENTO
CREATE TABLE IF NOT EXISTS public.planos_tratamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id),
  dentista_id uuid NOT NULL REFERENCES public.usuarios(id),
  status text NOT NULL DEFAULT 'Em avaliação' CHECK (status = ANY (ARRAY['Em avaliação','Apresentado','Aprovado','Reprovado','Em andamento','Concluído'])),
  valor_total numeric NOT NULL DEFAULT 0,
  entrada_sugerida numeric,
  numero_parcelas integer,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  forma_pagamento text,
  clinica_id uuid REFERENCES public.clinica(id)
);
ALTER TABLE public.planos_tratamento ENABLE ROW LEVEL SECURITY;

-- 3.13 PLANOS_TRATAMENTO_ITENS
CREATE TABLE IF NOT EXISTS public.planos_tratamento_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id uuid NOT NULL REFERENCES public.planos_tratamento(id),
  procedimento_nome text NOT NULL,
  dente_regiao text,
  quantidade integer NOT NULL DEFAULT 1,
  quantidade_aprovada integer NOT NULL DEFAULT 0,
  valor_unitario numeric NOT NULL DEFAULT 0,
  aprovado boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  clinica_id uuid REFERENCES public.clinica(id)
);
ALTER TABLE public.planos_tratamento_itens ENABLE ROW LEVEL SECURITY;

-- 3.14 RECEITAS
CREATE TABLE IF NOT EXISTS public.receitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id),
  plano_id uuid REFERENCES public.planos_tratamento(id),
  procedimento text,
  data date NOT NULL,
  forma_pagamento text NOT NULL CHECK (forma_pagamento = ANY (ARRAY['Dinheiro','Cartão de Crédito','Cartão de Débito','PIX','Boleto','Convênio'])),
  valor numeric NOT NULL,
  status text NOT NULL DEFAULT 'Em aberto' CHECK (status = ANY (ARRAY['Pago','Parcial','Em aberto'])),
  created_at timestamptz DEFAULT now(),
  clinica_id uuid REFERENCES public.clinica(id)
);
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;

-- 3.15 DESPESAS
CREATE TABLE IF NOT EXISTS public.despesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  categoria text NOT NULL CHECK (categoria = ANY (ARRAY['Aluguel','Materiais','Equipe','Marketing','Manutenção','Outros'])),
  descricao text NOT NULL,
  valor numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  clinica_id uuid REFERENCES public.clinica(id)
);
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- 3.16 DESPESAS_RECORRENTES
CREATE TABLE IF NOT EXISTS public.despesas_recorrentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  categoria text NOT NULL DEFAULT 'Outros',
  valor numeric NOT NULL DEFAULT 0,
  dia_vencimento integer NOT NULL DEFAULT 1,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  clinica_id uuid REFERENCES public.clinica(id)
);
ALTER TABLE public.despesas_recorrentes ENABLE ROW LEVEL SECURITY;

-- 3.17 TAREFAS
CREATE TABLE IF NOT EXISTS public.tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  paciente_id uuid REFERENCES public.pacientes(id),
  lead_id uuid REFERENCES public.leads(id),
  responsavel_id uuid REFERENCES public.usuarios(id),
  data_vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'Pendente' CHECK (status = ANY (ARRAY['Pendente','Em andamento','Concluída'])),
  created_at timestamptz DEFAULT now(),
  clinica_id uuid REFERENCES public.clinica(id)
);
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

-- 3.18 PROCEDIMENTOS_PADRAO
CREATE TABLE IF NOT EXISTS public.procedimentos_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  valor_base numeric NOT NULL DEFAULT 0,
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  clinica_id uuid REFERENCES public.clinica(id)
);
ALTER TABLE public.procedimentos_padrao ENABLE ROW LEVEL SECURITY;

-- 3.19 ODONTOGRAMA_ENTRADAS
CREATE TABLE IF NOT EXISTS public.odontograma_entradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id),
  dente_numero integer NOT NULL,
  face text NOT NULL DEFAULT 'completo',
  status text NOT NULL DEFAULT 'Saudável',
  procedimento text,
  observacao text,
  dentista_id uuid REFERENCES public.usuarios(id),
  data_registro date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  clinica_id uuid REFERENCES public.clinica(id)
);
ALTER TABLE public.odontograma_entradas ENABLE ROW LEVEL SECURITY;

-- 3.20 PRONTUARIO_ENTRADAS
CREATE TABLE IF NOT EXISTS public.prontuario_entradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id),
  tipo text NOT NULL DEFAULT 'Evolução',
  titulo text NOT NULL,
  descricao text,
  data_registro date NOT NULL DEFAULT CURRENT_DATE,
  dentista_id uuid REFERENCES public.usuarios(id),
  created_at timestamptz DEFAULT now(),
  clinica_id uuid REFERENCES public.clinica(id)
);
ALTER TABLE public.prontuario_entradas ENABLE ROW LEVEL SECURITY;

-- 3.21 PACIENTE_DOCUMENTOS
CREATE TABLE IF NOT EXISTS public.paciente_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id),
  nome_arquivo text NOT NULL,
  tipo_documento text NOT NULL CHECK (tipo_documento = ANY (ARRAY['Exame','Atestado','Laudo','Contrato','Receita','Foto','Outro'])),
  tipo_mime text NOT NULL,
  tamanho_bytes bigint NOT NULL,
  storage_path text NOT NULL UNIQUE,
  descricao text,
  usuario_upload_id uuid REFERENCES public.usuarios(id),
  created_at timestamptz DEFAULT now(),
  clinica_id uuid REFERENCES public.clinica(id)
);
ALTER TABLE public.paciente_documentos ENABLE ROW LEVEL SECURITY;

-- 3.22 INTEGRACOES
CREATE TABLE IF NOT EXISTS public.integracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES public.clinica(id),
  tipo text NOT NULL,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now()),
  setor_id uuid REFERENCES public.setores(id)
);
ALTER TABLE public.integracoes ENABLE ROW LEVEL SECURITY;

-- 3.23 CHAT_CONVERSAS
CREATE TABLE IF NOT EXISTS public.chat_conversas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  nome text NOT NULL,
  foto_url text,
  ultima_mensagem text,
  ultima_mensagem_at timestamptz DEFAULT now(),
  nao_lidas integer DEFAULT 0,
  lead_id uuid REFERENCES public.leads(id),
  paciente_id uuid REFERENCES public.pacientes(id),
  created_at timestamptz DEFAULT now(),
  chat_lid text,
  clinica_id uuid REFERENCES public.clinica(id),
  setor_id uuid REFERENCES public.setores(id),
  instance_id varchar,
  extraction_pending boolean DEFAULT false,
  supervisor_enabled boolean DEFAULT false,
  supervisor_guidance text,
  supervisor_guidance_at timestamptz,
  crm_nome varchar,
  crm_telefone varchar,
  crm_etapa_funil varchar,
  crm_interesse text,
  crm_problemas_identificados text,
  crm_urgencia varchar,
  crm_preferencia_modalidade varchar,
  crm_objecoes text,
  crm_preferencia_horario varchar,
  crm_resumo_geral text
);
ALTER TABLE public.chat_conversas ENABLE ROW LEVEL SECURITY;

-- 3.24 CHAT_MENSAGENS
CREATE TABLE IF NOT EXISTS public.chat_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES public.chat_conversas(id),
  message_id text,
  from_me boolean NOT NULL DEFAULT false,
  tipo text NOT NULL DEFAULT 'text',
  conteudo text,
  media_url text,
  media_mime_type text,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now(),
  clinica_id uuid REFERENCES public.clinica(id),
  zapi_moment bigint
);
ALTER TABLE public.chat_mensagens ENABLE ROW LEVEL SECURITY;

-- 3.25 CHAT_MODELOS_MENSAGEM
CREATE TABLE IF NOT EXISTS public.chat_modelos_mensagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid REFERENCES public.clinica(id),
  titulo text NOT NULL,
  conteudo text NOT NULL,
  categoria text,
  atalho text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.chat_modelos_mensagem ENABLE ROW LEVEL SECURITY;

-- 3.26 AUTOMACAO_MENSAGENS
CREATE TABLE IF NOT EXISTS public.automacao_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  referencia_id uuid,
  conversa_id uuid,
  phone text,
  enviada_at timestamptz NOT NULL DEFAULT now(),
  resposta text,
  respondida_at timestamptz,
  created_at timestamptz DEFAULT now(),
  clinica_id uuid REFERENCES public.clinica(id)
);
ALTER TABLE public.automacao_mensagens ENABLE ROW LEVEL SECURITY;

-- 3.27 MARKETING_INVESTIMENTOS
CREATE TABLE IF NOT EXISTS public.marketing_investimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canal text NOT NULL,
  mes date NOT NULL,
  valor_investido numeric NOT NULL DEFAULT 0,
  observacao text,
  created_at timestamptz DEFAULT now(),
  clinica_id uuid REFERENCES public.clinica(id)
);
ALTER TABLE public.marketing_investimentos ENABLE ROW LEVEL SECURITY;

-- 3.28 MARKETING_METAS
CREATE TABLE IF NOT EXISTS public.marketing_metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes date NOT NULL,
  meta_leads integer NOT NULL DEFAULT 0,
  meta_conversoes integer NOT NULL DEFAULT 0,
  meta_roi numeric,
  created_at timestamptz DEFAULT now(),
  clinica_id uuid REFERENCES public.clinica(id)
);
ALTER TABLE public.marketing_metas ENABLE ROW LEVEL SECURITY;

-- 3.29 NOTIFICATION_SETTINGS
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  ativo boolean DEFAULT true,
  email_destino text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  clinica_id uuid REFERENCES public.clinica(id)
);
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- 3.30 AUTH_GOOGLE_AGENDA
CREATE TABLE IF NOT EXISTS public.auth_google_agenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
  clinica_id uuid REFERENCES public.clinica(id),
  access_token text NOT NULL,
  refresh_token text,
  expiry_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.auth_google_agenda ENABLE ROW LEVEL SECURITY;

-- 3.31 SYSTEM_LOGS
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  clinica_id uuid REFERENCES public.clinica(id),
  usuario_id uuid REFERENCES public.usuarios(id),
  acao varchar NOT NULL,
  nivel varchar DEFAULT 'info',
  tabela varchar,
  registro_id uuid,
  detalhes jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- 3.32 SUPERVISOR_CONFIG
CREATE TABLE IF NOT EXISTS public.supervisor_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL UNIQUE REFERENCES public.clinica(id),
  system_prompt text NOT NULL DEFAULT 'Você é uma supervisora de vendas experiente em clínicas odontológicas. Analise o histórico da conversa entre um atendente e um lead, e oriente o próximo passo do atendente de forma direta e objetiva.

Regras:
- Seja direta. Máximo 3 frases.
- Sugira a próxima pergunta ou ação específica.
- Baseie-se no contexto real da conversa.
- Use o Script de Vendas como referência para guiar o atendente.
- Responda em português brasileiro.',
  sales_script text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.supervisor_config ENABLE ROW LEVEL SECURITY;

-- 3.33 _WEBHOOK_DEBUG (sem RLS)
CREATE TABLE IF NOT EXISTS public._webhook_debug (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  raw_payload jsonb,
  parsed jsonb,
  decision text
);

-- FK: usuarios -> auth.users
ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_auth_user_id_fkey
  FOREIGN KEY (auth_user_id) REFERENCES auth.users(id);
