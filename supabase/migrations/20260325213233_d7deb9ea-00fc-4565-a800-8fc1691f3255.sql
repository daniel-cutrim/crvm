
CREATE TABLE public.automacao_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  referencia_id uuid,
  conversa_id uuid,
  phone text,
  enviada_at timestamp with time zone NOT NULL DEFAULT now(),
  resposta text,
  respondida_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.automacao_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view automacoes" ON public.automacao_mensagens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert automacoes" ON public.automacao_mensagens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update automacoes" ON public.automacao_mensagens FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access automacoes" ON public.automacao_mensagens FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_automacao_tipo_ref ON public.automacao_mensagens(tipo, referencia_id);
CREATE INDEX idx_automacao_phone ON public.automacao_mensagens(phone);
