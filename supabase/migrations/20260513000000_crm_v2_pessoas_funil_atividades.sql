-- CRM v2: Pessoas, Funil Etapa Histórico, Campos Personalizados
-- Fase 1 — Estrutura base para módulo CRM avançado
-- Applied to Supabase project: 2026-05-13

-- =============================================================================
-- 1. TABELA: pessoas
--    Substitui/complementa `pacientes` no contexto do CRM
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pessoas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id  UUID        REFERENCES public.clinica(id) ON DELETE CASCADE,
  nome        TEXT        NOT NULL,
  email       TEXT,
  telefone    TEXT,
  organizacao TEXT,
  observacoes TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;

-- Auto-injeção de clinica_id (padrão multi-tenant do projeto)
DROP TRIGGER IF EXISTS ensure_tenant_pessoas ON public.pessoas;
CREATE TRIGGER ensure_tenant_pessoas
  BEFORE INSERT ON public.pessoas
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- RLS Policies — pessoas
CREATE POLICY "Tenant Isolation: Select pessoas"
  ON public.pessoas FOR SELECT
  USING (clinica_id = get_user_clinica_id());

CREATE POLICY "Tenant Isolation: Insert pessoas"
  ON public.pessoas FOR INSERT
  WITH CHECK (clinica_id = get_user_clinica_id());

CREATE POLICY "Tenant Isolation: Update pessoas"
  ON public.pessoas FOR UPDATE
  USING (clinica_id = get_user_clinica_id());

-- Apenas gestor pode deletar pessoas
CREATE POLICY "Tenant Isolation: Delete pessoas"
  ON public.pessoas FOR DELETE
  USING (clinica_id = get_user_clinica_id() AND is_gestor());

-- Índice
CREATE INDEX IF NOT EXISTS idx_pessoas_clinica_id ON public.pessoas(clinica_id);


-- =============================================================================
-- 2. ALTER TABLE: leads — novas colunas para CRM v2
-- =============================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS pessoa_id      UUID        REFERENCES public.pessoas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proprietario_id UUID       REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS valor          DECIMAL(10,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_leads_pessoa_id       ON public.leads(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_leads_proprietario_id ON public.leads(proprietario_id);


-- =============================================================================
-- 3. TABELA: lead_etapa_historico
--    Rastreia quanto tempo cada lead ficou em cada etapa do funil
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lead_etapa_historico (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  etapa_id    UUID        REFERENCES public.funil_etapas(id) ON DELETE SET NULL,
  etapa_nome  TEXT        NOT NULL,
  entrada_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  saida_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lead_etapa_historico ENABLE ROW LEVEL SECURITY;

-- Não tem clinica_id direto; acesso via lead_id → leads → clinica_id
CREATE POLICY "Tenant Isolation: Select lead_etapa_historico"
  ON public.lead_etapa_historico FOR SELECT
  USING (
    lead_id IN (
      SELECT id FROM public.leads WHERE clinica_id = get_user_clinica_id()
    )
  );

CREATE POLICY "Tenant Isolation: Insert lead_etapa_historico"
  ON public.lead_etapa_historico FOR INSERT
  WITH CHECK (
    lead_id IN (
      SELECT id FROM public.leads WHERE clinica_id = get_user_clinica_id()
    )
  );

CREATE POLICY "Tenant Isolation: Update lead_etapa_historico"
  ON public.lead_etapa_historico FOR UPDATE
  USING (
    lead_id IN (
      SELECT id FROM public.leads WHERE clinica_id = get_user_clinica_id()
    )
  );

CREATE POLICY "Tenant Isolation: Delete lead_etapa_historico"
  ON public.lead_etapa_historico FOR DELETE
  USING (
    lead_id IN (
      SELECT id FROM public.leads WHERE clinica_id = get_user_clinica_id()
    )
  );

-- Índice
CREATE INDEX IF NOT EXISTS idx_lead_etapa_historico_lead_id ON public.lead_etapa_historico(lead_id);


-- =============================================================================
-- 4. TABELAS: Campos Personalizados
--    campos_categorias → campos_personalizados → campos_valores
-- =============================================================================

-- 4a. Categorias (agrupadores de campos, vinculados a funis)
CREATE TABLE IF NOT EXISTS public.campos_categorias (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID        REFERENCES public.clinica(id) ON DELETE CASCADE,
  nome       TEXT        NOT NULL,
  funis_ids  UUID[]      DEFAULT '{}',
  ordem      INTEGER     DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.campos_categorias ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS ensure_tenant_campos_categorias ON public.campos_categorias;
CREATE TRIGGER ensure_tenant_campos_categorias
  BEFORE INSERT ON public.campos_categorias
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE POLICY "Tenant Isolation: Select campos_categorias"
  ON public.campos_categorias FOR SELECT
  USING (clinica_id = get_user_clinica_id());

CREATE POLICY "Tenant Isolation: Insert campos_categorias"
  ON public.campos_categorias FOR INSERT
  WITH CHECK (clinica_id = get_user_clinica_id());

CREATE POLICY "Tenant Isolation: Update campos_categorias"
  ON public.campos_categorias FOR UPDATE
  USING (clinica_id = get_user_clinica_id());

CREATE POLICY "Tenant Isolation: Delete campos_categorias"
  ON public.campos_categorias FOR DELETE
  USING (clinica_id = get_user_clinica_id());

CREATE INDEX IF NOT EXISTS idx_campos_categorias_clinica_id ON public.campos_categorias(clinica_id);


-- 4b. Campos dentro de cada categoria
CREATE TABLE IF NOT EXISTS public.campos_personalizados (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID        NOT NULL REFERENCES public.campos_categorias(id) ON DELETE CASCADE,
  nome         TEXT        NOT NULL,
  tipo         TEXT        NOT NULL DEFAULT 'texto'
                           CHECK (tipo IN ('texto', 'numero', 'data', 'lista', 'booleano', 'moeda')),
  opcoes_lista TEXT[],
  obrigatorio  BOOLEAN     DEFAULT false,
  ordem        INTEGER     DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.campos_personalizados ENABLE ROW LEVEL SECURITY;

-- Acesso via categoria_id → campos_categorias → clinica_id
CREATE POLICY "Tenant Isolation: Select campos_personalizados"
  ON public.campos_personalizados FOR SELECT
  USING (
    categoria_id IN (
      SELECT id FROM public.campos_categorias WHERE clinica_id = get_user_clinica_id()
    )
  );

CREATE POLICY "Tenant Isolation: Insert campos_personalizados"
  ON public.campos_personalizados FOR INSERT
  WITH CHECK (
    categoria_id IN (
      SELECT id FROM public.campos_categorias WHERE clinica_id = get_user_clinica_id()
    )
  );

CREATE POLICY "Tenant Isolation: Update campos_personalizados"
  ON public.campos_personalizados FOR UPDATE
  USING (
    categoria_id IN (
      SELECT id FROM public.campos_categorias WHERE clinica_id = get_user_clinica_id()
    )
  );

CREATE POLICY "Tenant Isolation: Delete campos_personalizados"
  ON public.campos_personalizados FOR DELETE
  USING (
    categoria_id IN (
      SELECT id FROM public.campos_categorias WHERE clinica_id = get_user_clinica_id()
    )
  );

CREATE INDEX IF NOT EXISTS idx_campos_personalizados_categoria_id ON public.campos_personalizados(categoria_id);


-- 4c. Valores preenchidos nos campos para cada lead
CREATE TABLE IF NOT EXISTS public.campos_valores (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campo_id   UUID        NOT NULL REFERENCES public.campos_personalizados(id) ON DELETE CASCADE,
  lead_id    UUID        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  valor      TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campo_id, lead_id)
);

ALTER TABLE public.campos_valores ENABLE ROW LEVEL SECURITY;

-- Acesso via lead_id → leads → clinica_id
CREATE POLICY "Tenant Isolation: Select campos_valores"
  ON public.campos_valores FOR SELECT
  USING (
    lead_id IN (
      SELECT id FROM public.leads WHERE clinica_id = get_user_clinica_id()
    )
  );

CREATE POLICY "Tenant Isolation: Insert campos_valores"
  ON public.campos_valores FOR INSERT
  WITH CHECK (
    lead_id IN (
      SELECT id FROM public.leads WHERE clinica_id = get_user_clinica_id()
    )
  );

CREATE POLICY "Tenant Isolation: Update campos_valores"
  ON public.campos_valores FOR UPDATE
  USING (
    lead_id IN (
      SELECT id FROM public.leads WHERE clinica_id = get_user_clinica_id()
    )
  );

CREATE POLICY "Tenant Isolation: Delete campos_valores"
  ON public.campos_valores FOR DELETE
  USING (
    lead_id IN (
      SELECT id FROM public.leads WHERE clinica_id = get_user_clinica_id()
    )
  );

CREATE INDEX IF NOT EXISTS idx_campos_valores_lead_id    ON public.campos_valores(lead_id);
CREATE INDEX IF NOT EXISTS idx_campos_valores_campo_id   ON public.campos_valores(campo_id);


-- =============================================================================
-- 5. ALTER TABLE: tarefas — adicionar tipo e pessoa_id
-- =============================================================================

ALTER TABLE public.tarefas
  ADD COLUMN IF NOT EXISTS tipo      TEXT DEFAULT 'outros'
                                     CHECK (tipo IN ('follow_up', 'ligacao', 'reuniao', 'email', 'outros')),
  ADD COLUMN IF NOT EXISTS pessoa_id UUID REFERENCES public.pessoas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tarefas_pessoa_id ON public.tarefas(pessoa_id);


-- =============================================================================
-- FIM DA MIGRATION
-- =============================================================================
