-- ============================================================
-- MIGRATION: Novos campos e tabela de produtos
-- Projeto: CRM Odonto (Supabase/PostgreSQL)
-- Data: 2026-05-15
--
-- O QUE ESTE ARQUIVO FAZ:
--   1. Adiciona campos de valor/ganho na tabela `leads`
--      (valor_coletado, valor_contrato, produtos_interesse)
--   2. Cria a tabela `produtos` vinculada a `empresa`
--      com RLS e Realtime habilitados
--   3. Adiciona coluna `permissoes` (JSONB) na tabela `usuarios`
--
-- PRÉ-REQUISITO:
--   Este arquivo assume que a migration `migration_empresa_rename.sql`
--   já foi executada, ou seja, a tabela se chama `empresa` e as
--   colunas se chamam `empresa_id`.
--
-- COMO EXECUTAR:
--   Cole este conteúdo no Supabase SQL Editor e execute.
--   Execute APÓS a migration de renomeação ter sido concluída.
-- ============================================================


-- ============================================================
-- 1. Novos campos na tabela leads
-- ============================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS valor_coletado   DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS valor_contrato   DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS produtos_interesse TEXT[];


-- ============================================================
-- 2. Tabela de produtos da empresa
-- ============================================================

CREATE TABLE IF NOT EXISTS public.produtos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID        NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  nome       TEXT        NOT NULL,
  ativo      BOOLEAN     DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Trigger de auto-injeção de tenant
DROP TRIGGER IF EXISTS ensure_tenant_produtos ON public.produtos;
CREATE TRIGGER ensure_tenant_produtos
  BEFORE INSERT ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- RLS policy unificada para produtos
DROP POLICY IF EXISTS "produtos_empresa_access" ON public.produtos;

CREATE POLICY "produtos_empresa_access"
  ON public.produtos FOR ALL
  USING (
    empresa_id = (
      SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    empresa_id = (
      SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
  );

-- Índice
CREATE INDEX IF NOT EXISTS idx_produtos_empresa_id ON public.produtos(empresa_id);


-- ============================================================
-- 3. Nova coluna permissoes em usuarios
-- ============================================================

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS permissoes JSONB DEFAULT '{}';


-- ============================================================
-- 4. Habilitar Realtime para produtos
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;


-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
