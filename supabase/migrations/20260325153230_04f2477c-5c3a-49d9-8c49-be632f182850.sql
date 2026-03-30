
-- Marketing investments table (monthly ad spend per channel)
CREATE TABLE public.marketing_investimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canal TEXT NOT NULL,
  mes DATE NOT NULL,
  valor_investido NUMERIC NOT NULL DEFAULT 0,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Marketing goals table
CREATE TABLE public.marketing_metas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes DATE NOT NULL,
  meta_leads INTEGER NOT NULL DEFAULT 0,
  meta_conversoes INTEGER NOT NULL DEFAULT 0,
  meta_roi NUMERIC DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_investimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_metas ENABLE ROW LEVEL SECURITY;

-- Only gestores can manage marketing data
CREATE POLICY "Gestores podem ver investimentos" ON public.marketing_investimentos
  FOR SELECT TO authenticated USING (is_gestor());

CREATE POLICY "Gestores podem inserir investimentos" ON public.marketing_investimentos
  FOR INSERT TO authenticated WITH CHECK (is_gestor());

CREATE POLICY "Gestores podem atualizar investimentos" ON public.marketing_investimentos
  FOR UPDATE TO authenticated USING (is_gestor()) WITH CHECK (is_gestor());

CREATE POLICY "Gestores podem deletar investimentos" ON public.marketing_investimentos
  FOR DELETE TO authenticated USING (is_gestor());

CREATE POLICY "Gestores podem ver metas" ON public.marketing_metas
  FOR SELECT TO authenticated USING (is_gestor());

CREATE POLICY "Gestores podem inserir metas" ON public.marketing_metas
  FOR INSERT TO authenticated WITH CHECK (is_gestor());

CREATE POLICY "Gestores podem atualizar metas" ON public.marketing_metas
  FOR UPDATE TO authenticated USING (is_gestor()) WITH CHECK (is_gestor());

CREATE POLICY "Gestores podem deletar metas" ON public.marketing_metas
  FOR DELETE TO authenticated USING (is_gestor());
