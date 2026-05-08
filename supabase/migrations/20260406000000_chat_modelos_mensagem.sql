-- Tabela para modelos de mensagem (templates) do chat
CREATE TABLE IF NOT EXISTS public.chat_modelos_mensagem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID REFERENCES public.clinica(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  categoria TEXT,
  atalho TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.chat_modelos_mensagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinica members can view own templates"
  ON public.chat_modelos_mensagem FOR SELECT
  USING (clinica_id IN (
    SELECT clinica_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Clinica members can insert own templates"
  ON public.chat_modelos_mensagem FOR INSERT
  WITH CHECK (clinica_id IN (
    SELECT clinica_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Clinica members can update own templates"
  ON public.chat_modelos_mensagem FOR UPDATE
  USING (clinica_id IN (
    SELECT clinica_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Clinica members can delete own templates"
  ON public.chat_modelos_mensagem FOR DELETE
  USING (clinica_id IN (
    SELECT clinica_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  ));

-- Index para busca rápida
CREATE INDEX idx_chat_modelos_clinica ON public.chat_modelos_mensagem(clinica_id);
CREATE INDEX idx_chat_modelos_atalho ON public.chat_modelos_mensagem(clinica_id, atalho) WHERE atalho IS NOT NULL;
