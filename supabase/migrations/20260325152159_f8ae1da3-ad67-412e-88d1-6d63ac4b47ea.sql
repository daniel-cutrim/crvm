
CREATE TABLE public.odontograma_entradas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  dente_numero INTEGER NOT NULL,
  face TEXT NOT NULL DEFAULT 'completo',
  status TEXT NOT NULL DEFAULT 'Saudável',
  procedimento TEXT,
  observacao TEXT,
  dentista_id UUID REFERENCES public.usuarios(id),
  data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.odontograma_entradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Podem ver odontograma" ON public.odontograma_entradas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Dentistas e gestores podem inserir odontograma" ON public.odontograma_entradas
  FOR INSERT TO authenticated WITH CHECK (is_gestor() OR is_dentista());

CREATE POLICY "Dentistas e gestores podem atualizar odontograma" ON public.odontograma_entradas
  FOR UPDATE TO authenticated
  USING (is_gestor() OR (dentista_id = get_user_id()))
  WITH CHECK (is_gestor() OR (dentista_id = get_user_id()));

CREATE POLICY "Gestores podem deletar odontograma" ON public.odontograma_entradas
  FOR DELETE TO authenticated USING (is_gestor());
