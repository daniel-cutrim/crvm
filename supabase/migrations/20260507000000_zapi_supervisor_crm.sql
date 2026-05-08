-- Z-API Supervisor + CRM Extraction fields
-- Applied to Supabase project wdtwysjfusehzmzlfkaj on 2026-05-07

-- Add Z-API supervisor and CRM extraction fields to chat_conversas
ALTER TABLE chat_conversas ADD COLUMN IF NOT EXISTS instance_id VARCHAR;
ALTER TABLE chat_conversas ADD COLUMN IF NOT EXISTS extraction_pending BOOLEAN DEFAULT false;
ALTER TABLE chat_conversas ADD COLUMN IF NOT EXISTS supervisor_enabled BOOLEAN DEFAULT false;
ALTER TABLE chat_conversas ADD COLUMN IF NOT EXISTS supervisor_guidance TEXT;
ALTER TABLE chat_conversas ADD COLUMN IF NOT EXISTS supervisor_guidance_at TIMESTAMPTZ;

-- CRM fields (populated by debounced AI extraction)
ALTER TABLE chat_conversas ADD COLUMN IF NOT EXISTS crm_nome VARCHAR;
ALTER TABLE chat_conversas ADD COLUMN IF NOT EXISTS crm_telefone VARCHAR;
ALTER TABLE chat_conversas ADD COLUMN IF NOT EXISTS crm_etapa_funil VARCHAR;
ALTER TABLE chat_conversas ADD COLUMN IF NOT EXISTS crm_interesse TEXT;
ALTER TABLE chat_conversas ADD COLUMN IF NOT EXISTS crm_problemas_identificados TEXT;
ALTER TABLE chat_conversas ADD COLUMN IF NOT EXISTS crm_urgencia VARCHAR;
ALTER TABLE chat_conversas ADD COLUMN IF NOT EXISTS crm_preferencia_modalidade VARCHAR;
ALTER TABLE chat_conversas ADD COLUMN IF NOT EXISTS crm_objecoes TEXT;
ALTER TABLE chat_conversas ADD COLUMN IF NOT EXISTS crm_preferencia_horario VARCHAR;
ALTER TABLE chat_conversas ADD COLUMN IF NOT EXISTS crm_resumo_geral TEXT;

-- Add zapi_moment to messages
ALTER TABLE chat_mensagens ADD COLUMN IF NOT EXISTS zapi_moment BIGINT;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_chat_conversas_extraction 
  ON chat_conversas(extraction_pending, ultima_mensagem_at) 
  WHERE extraction_pending = true;
CREATE INDEX IF NOT EXISTS idx_chat_conversas_supervisor 
  ON chat_conversas(supervisor_enabled) 
  WHERE supervisor_enabled = true;
