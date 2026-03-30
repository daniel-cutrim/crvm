
CREATE TABLE public.despesas_recorrentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  categoria text NOT NULL DEFAULT 'Outros',
  valor numeric NOT NULL DEFAULT 0,
  dia_vencimento integer NOT NULL DEFAULT 1,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.despesas_recorrentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem ver despesas recorrentes" ON public.despesas_recorrentes
  FOR SELECT TO authenticated USING (is_gestor());

CREATE POLICY "Gestores podem criar despesas recorrentes" ON public.despesas_recorrentes
  FOR INSERT TO authenticated WITH CHECK (is_gestor());

CREATE POLICY "Gestores podem atualizar despesas recorrentes" ON public.despesas_recorrentes
  FOR UPDATE TO authenticated USING (is_gestor()) WITH CHECK (is_gestor());

CREATE POLICY "Gestores podem deletar despesas recorrentes" ON public.despesas_recorrentes
  FOR DELETE TO authenticated USING (is_gestor());
