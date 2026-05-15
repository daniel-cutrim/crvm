-- Adiciona coluna nome à tabela tarefas
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS nome TEXT;
