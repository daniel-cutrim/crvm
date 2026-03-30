
-- Tabela de entradas do prontuário
CREATE TABLE public.prontuario_entradas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'Evolução',
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  dentista_id UUID REFERENCES public.usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.prontuario_entradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Podem ver prontuário" ON public.prontuario_entradas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Dentistas e gestores podem inserir" ON public.prontuario_entradas
  FOR INSERT TO authenticated WITH CHECK (is_gestor() OR is_dentista());

CREATE POLICY "Dentistas e gestores podem atualizar" ON public.prontuario_entradas
  FOR UPDATE TO authenticated
  USING (is_gestor() OR dentista_id = get_user_id())
  WITH CHECK (is_gestor() OR dentista_id = get_user_id());

CREATE POLICY "Gestores podem deletar" ON public.prontuario_entradas
  FOR DELETE TO authenticated USING (is_gestor());
