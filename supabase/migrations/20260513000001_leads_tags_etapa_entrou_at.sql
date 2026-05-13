-- Add tags array and etapa_entrou_at to leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS etapa_entrou_at timestamptz;
