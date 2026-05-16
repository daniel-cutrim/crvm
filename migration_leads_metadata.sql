-- Adiciona coluna metadata à tabela leads para campos personalizados
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}' NOT NULL;
