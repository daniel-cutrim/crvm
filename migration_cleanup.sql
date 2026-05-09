-- ============================================================
-- CRVM - SQL DE LIMPEZA: Remover tabelas e recursos médicos
-- Execute no SQL Editor do novo projeto Supabase
-- ============================================================

-- 1. DROP de tabelas médicas/odontológicas (ordem de dependência)
DROP TABLE IF EXISTS public.odontograma_entradas CASCADE;
DROP TABLE IF EXISTS public.prontuario_entradas CASCADE;
DROP TABLE IF EXISTS public.paciente_documentos CASCADE;
DROP TABLE IF EXISTS public.planos_tratamento_itens CASCADE;
DROP TABLE IF EXISTS public.planos_tratamento CASCADE;
DROP TABLE IF EXISTS public.procedimentos_padrao CASCADE;
DROP TABLE IF EXISTS public._webhook_debug CASCADE;

-- 2. DROP de sequences desnecessárias
DROP SEQUENCE IF EXISTS public.paciente_codigo_seq CASCADE;
DROP SEQUENCE IF EXISTS public.pacientes_codigo_seq CASCADE;

-- 3. DROP de função desnecessária
DROP FUNCTION IF EXISTS public.set_codigo_paciente() CASCADE;

-- 4. Renomear roles: Dentista → Profissional
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_papel_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_papel_check
  CHECK (papel = ANY (ARRAY['Recepção','Profissional','Gestor','Gestor/Profissional']));

-- Atualizar dados existentes
UPDATE public.usuarios SET papel = 'Profissional' WHERE papel = 'Dentista';
UPDATE public.usuarios SET papel = 'Gestor/Profissional' WHERE papel = 'Gestor/Dentista';

-- 5. Renomear is_dentista → is_profissional
DROP FUNCTION IF EXISTS public.is_dentista();

CREATE OR REPLACE FUNCTION public.is_profissional()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE auth_user_id = auth.uid()
    AND papel = 'Profissional'
  )
$$;

-- 6. Limpar colunas médicas de pacientes (agora "contatos")
ALTER TABLE public.pacientes DROP COLUMN IF EXISTS codigo_paciente;
ALTER TABLE public.pacientes DROP COLUMN IF EXISTS informacoes_clinicas;
ALTER TABLE public.pacientes DROP COLUMN IF EXISTS dentista_id;

-- 7. Remover trigger de código de paciente
DROP TRIGGER IF EXISTS trg_set_codigo_paciente ON public.pacientes;

-- 8. Remover storage bucket de documentos médicos
DELETE FROM storage.objects WHERE bucket_id = 'paciente-documentos';
DELETE FROM storage.buckets WHERE id = 'paciente-documentos';
