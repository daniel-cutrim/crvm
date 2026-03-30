
-- Chat conversations table
CREATE TABLE public.chat_conversas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  nome text NOT NULL,
  foto_url text,
  ultima_mensagem text,
  ultima_mensagem_at timestamp with time zone DEFAULT now(),
  nao_lidas integer DEFAULT 0,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  paciente_id uuid REFERENCES public.pacientes(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(phone)
);

-- Chat messages table
CREATE TABLE public.chat_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES public.chat_conversas(id) ON DELETE CASCADE,
  message_id text,
  from_me boolean NOT NULL DEFAULT false,
  tipo text NOT NULL DEFAULT 'text',
  conteudo text,
  media_url text,
  media_mime_type text,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  status text DEFAULT 'sent',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mensagens ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_conversas
CREATE POLICY "Authenticated users can view conversations"
  ON public.chat_conversas FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert conversations"
  ON public.chat_conversas FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update conversations"
  ON public.chat_conversas FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- RLS policies for chat_mensagens
CREATE POLICY "Authenticated users can view messages"
  ON public.chat_mensagens FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert messages"
  ON public.chat_mensagens FOR INSERT TO authenticated
  WITH CHECK (true);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_mensagens;

-- Index for performance
CREATE INDEX idx_chat_mensagens_conversa ON public.chat_mensagens(conversa_id, timestamp DESC);
CREATE INDEX idx_chat_conversas_phone ON public.chat_conversas(phone);
