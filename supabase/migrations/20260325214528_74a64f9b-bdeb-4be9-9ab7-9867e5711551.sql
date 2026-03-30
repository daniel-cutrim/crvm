
ALTER TABLE public.leads DROP CONSTRAINT leads_convertido_paciente_id_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_convertido_paciente_id_fkey FOREIGN KEY (convertido_paciente_id) REFERENCES public.pacientes(id) ON DELETE SET NULL;

ALTER TABLE public.consultas DROP CONSTRAINT consultas_paciente_id_fkey;
ALTER TABLE public.consultas ADD CONSTRAINT consultas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE CASCADE;

ALTER TABLE public.planos_tratamento DROP CONSTRAINT planos_tratamento_paciente_id_fkey;
ALTER TABLE public.planos_tratamento ADD CONSTRAINT planos_tratamento_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE CASCADE;

ALTER TABLE public.receitas DROP CONSTRAINT receitas_paciente_id_fkey;
ALTER TABLE public.receitas ADD CONSTRAINT receitas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE CASCADE;

ALTER TABLE public.prontuario_entradas DROP CONSTRAINT prontuario_entradas_paciente_id_fkey;
ALTER TABLE public.prontuario_entradas ADD CONSTRAINT prontuario_entradas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE CASCADE;

ALTER TABLE public.tarefas DROP CONSTRAINT tarefas_paciente_id_fkey;
ALTER TABLE public.tarefas ADD CONSTRAINT tarefas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE SET NULL;

ALTER TABLE public.paciente_documentos DROP CONSTRAINT paciente_documentos_paciente_id_fkey;
ALTER TABLE public.paciente_documentos ADD CONSTRAINT paciente_documentos_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE CASCADE;

ALTER TABLE public.odontograma_entradas DROP CONSTRAINT odontograma_entradas_paciente_id_fkey;
ALTER TABLE public.odontograma_entradas ADD CONSTRAINT odontograma_entradas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE CASCADE;

ALTER TABLE public.chat_conversas DROP CONSTRAINT chat_conversas_paciente_id_fkey;
ALTER TABLE public.chat_conversas ADD CONSTRAINT chat_conversas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE SET NULL;
