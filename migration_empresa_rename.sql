-- ============================================================
-- MIGRATION: Renomear clinica → empresa / clinica_id → empresa_id
-- Projeto: CRM Odonto (Supabase/PostgreSQL)
-- Data: 2026-05-15
--
-- O QUE ESTE ARQUIVO FAZ:
--   1. Renomeia a tabela `clinica` para `empresa`
--   2. Renomeia a coluna `clinica_id` para `empresa_id` em todas
--      as tabelas que a possuem
--   3. Atualiza as funções auxiliares de tenant (get_user_clinica_id,
--      set_tenant_id, handle_new_user) para usar o novo nome
--   4. Recria as RLS policies de todas as tabelas com o novo nome
--
-- COMO EXECUTAR:
--   Cole este conteúdo no Supabase SQL Editor e execute.
--   Recomenda-se executar em uma transação única ou seção a seção
--   acompanhando os erros.
--
-- OBSERVAÇÃO IMPORTANTE SOBRE FOREIGN KEYS:
--   No PostgreSQL, ao renomear uma coluna com ALTER TABLE ... RENAME COLUMN,
--   as constraints de FK (foreign key) são atualizadas automaticamente —
--   nenhuma ação extra é necessária para elas.
--   Porém, as RLS policies que referenciam o nome da coluna como STRING
--   (ex.: `clinica_id = get_user_clinica_id()`) NÃO são atualizadas
--   automaticamente. Por isso este arquivo dropa e recria todas as policies
--   afetadas com o novo nome `empresa_id`.
-- ============================================================

-- ============================================================
-- PASSO 1: Renomear a tabela raiz
-- ============================================================

ALTER TABLE IF EXISTS public.clinica RENAME TO empresa;


-- ============================================================
-- PASSO 2: Renomear clinica_id → empresa_id em todas as tabelas
-- ============================================================

-- usuarios
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.usuarios RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- setores
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'setores' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.setores RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- pacientes
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pacientes' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.pacientes RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- funis
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'funis' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.funis RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- funil_etapas
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'funil_etapas' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.funil_etapas RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- leads
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.leads RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- lead_jornada
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lead_jornada' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.lead_jornada RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- leads_historico
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads_historico' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.leads_historico RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- lead_historico (nome alternativo, caso exista)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lead_historico' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.lead_historico RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- lead_etapa_historico (sem clinica_id direto — acesso via leads — mas incluído por segurança)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lead_etapa_historico' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.lead_etapa_historico RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- consultas
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'consultas' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.consultas RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- tarefas
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tarefas' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.tarefas RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- chat_conversas
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chat_conversas' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.chat_conversas RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- chat_mensagens
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chat_mensagens' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.chat_mensagens RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- chat_modelos_mensagem
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chat_modelos_mensagem' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.chat_modelos_mensagem RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- automacao_mensagens
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'automacao_mensagens' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.automacao_mensagens RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- marketing_investimentos
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'marketing_investimentos' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.marketing_investimentos RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- marketing_metas
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'marketing_metas' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.marketing_metas RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- procedimentos_padrao
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'procedimentos_padrao' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.procedimentos_padrao RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- integracoes
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'integracoes' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.integracoes RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- supervisor_config
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'supervisor_config' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.supervisor_config RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- notification_settings
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notification_settings' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.notification_settings RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- campo_categoria (nome singular, caso exista)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'campo_categoria' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.campo_categoria RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- campos_categorias (nome plural usado na migration crm_v2)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'campos_categorias' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.campos_categorias RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- system_logs
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'system_logs' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.system_logs RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- pessoas
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pessoas' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.pessoas RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- planos_tratamento
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'planos_tratamento' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.planos_tratamento RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- planos_tratamento_itens
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'planos_tratamento_itens' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.planos_tratamento_itens RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- paciente_documentos
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'paciente_documentos' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.paciente_documentos RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- odontograma_entradas
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'odontograma_entradas' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.odontograma_entradas RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- prontuario_entradas
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'prontuario_entradas' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.prontuario_entradas RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- auth_google_agenda
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'auth_google_agenda' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.auth_google_agenda RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- receitas
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'receitas' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.receitas RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- despesas
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'despesas' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.despesas RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;

-- despesas_recorrentes
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'despesas_recorrentes' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE public.despesas_recorrentes RENAME COLUMN clinica_id TO empresa_id;
  END IF;
END $$;


-- ============================================================
-- PASSO 3: Atualizar funções auxiliares de tenant
-- ============================================================

-- Função que retorna o empresa_id do usuário logado (era get_user_clinica_id)
-- Mantemos o nome original para compatibilidade com código existente que
-- ainda não foi atualizado, mas atualizamos o corpo para usar empresa_id.
-- Opcionalmente, crie também get_user_empresa_id() como alias moderno.
CREATE OR REPLACE FUNCTION public.get_user_clinica_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Alias moderno — use este em código novo
CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT empresa_id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Trigger de auto-injeção de tenant (set_tenant_id)
CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_empresa uuid;
BEGIN
  v_user_empresa := public.get_user_empresa_id();
  IF NEW.empresa_id IS NULL AND v_user_empresa IS NOT NULL THEN
    NEW.empresa_id := v_user_empresa;
  END IF;
  RETURN NEW;
END;
$$;

-- Função de criação de usuário ao registrar no auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_empresa_id uuid;
  v_role text;
  v_count int;
BEGIN
  v_empresa_id := (NEW.raw_user_meta_data->>'empresa_id')::uuid;

  -- Compatibilidade: aceita clinica_id no meta também
  IF v_empresa_id IS NULL THEN
    v_empresa_id := (NEW.raw_user_meta_data->>'clinica_id')::uuid;
  END IF;

  IF v_empresa_id IS NULL THEN
    INSERT INTO public.empresa (nome)
    VALUES ('Empresa de ' || COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)))
    RETURNING id INTO v_empresa_id;
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.usuarios WHERE empresa_id = v_empresa_id;

  IF v_count = 0 THEN
    v_role := 'Gestor';
  ELSE
    v_role := COALESCE(NEW.raw_user_meta_data->>'papel', 'Recepção');
  END IF;

  INSERT INTO public.usuarios (auth_user_id, nome, email, papel, empresa_id, ativo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_role,
    v_empresa_id,
    true
  );

  RETURN NEW;
END;
$$;


-- ============================================================
-- PASSO 4: Recriar RLS policies com empresa_id
--
-- NOTA: As policies abaixo usam get_user_clinica_id() que já foi
-- atualizada no Passo 3 para ler empresa_id. Se preferir usar o
-- alias get_user_empresa_id(), substitua manualmente.
-- ============================================================

-- ---- empresa (antiga clinica) ----
DROP POLICY IF EXISTS "Tenant Isolation: Select Clinica" ON public.empresa;
DROP POLICY IF EXISTS "Tenant Isolation: Update Clinica" ON public.empresa;
DROP POLICY IF EXISTS "Tenant Isolation: Delete Clinica" ON public.empresa;

CREATE POLICY "Tenant Isolation: Select Empresa" ON public.empresa
  FOR SELECT USING (id = get_user_clinica_id());
CREATE POLICY "Tenant Isolation: Update Empresa" ON public.empresa
  FOR UPDATE USING (id = get_user_clinica_id() AND is_gestor());
CREATE POLICY "Tenant Isolation: Delete Empresa" ON public.empresa
  FOR DELETE USING (id = get_user_clinica_id() AND is_gestor());


-- ---- usuarios ----
DROP POLICY IF EXISTS "Tenant Isolation: Select usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Tenant Isolation: Insert usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Tenant Isolation: Update usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Tenant Isolation: Delete usuarios" ON public.usuarios;

CREATE POLICY "Tenant Isolation: Select usuarios" ON public.usuarios
  FOR SELECT USING (empresa_id = get_user_clinica_id());
CREATE POLICY "Tenant Isolation: Insert usuarios" ON public.usuarios
  FOR INSERT WITH CHECK (empresa_id = get_user_clinica_id());
CREATE POLICY "Tenant Isolation: Update usuarios" ON public.usuarios
  FOR UPDATE USING (empresa_id = get_user_clinica_id());
CREATE POLICY "Tenant Isolation: Delete usuarios" ON public.usuarios
  FOR DELETE USING (empresa_id = get_user_clinica_id() AND is_gestor());


-- ---- Tabelas com padrão SELECT/INSERT/UPDATE/DELETE por empresa_id (sem restrição extra) ----
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'auth_google_agenda','automacao_mensagens','chat_conversas','chat_mensagens',
    'funil_etapas','funis','integracoes','lead_jornada','leads_historico',
    'marketing_investimentos','marketing_metas','notification_settings',
    'odontograma_entradas','paciente_documentos','planos_tratamento_itens',
    'procedimentos_padrao','prontuario_entradas','setores','system_logs'
  ])
  LOOP
    -- Pula tabelas que não existem no banco
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation: Select %1$s" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation: Insert %1$s" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation: Update %1$s" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation: Delete %1$s" ON public.%1$I', tbl);

    EXECUTE format('CREATE POLICY "Tenant Isolation: Select %1$s" ON public.%1$I FOR SELECT USING (empresa_id = get_user_clinica_id())', tbl);
    EXECUTE format('CREATE POLICY "Tenant Isolation: Insert %1$s" ON public.%1$I FOR INSERT WITH CHECK (empresa_id = get_user_clinica_id())', tbl);
    EXECUTE format('CREATE POLICY "Tenant Isolation: Update %1$s" ON public.%1$I FOR UPDATE USING (empresa_id = get_user_clinica_id())', tbl);
    EXECUTE format('CREATE POLICY "Tenant Isolation: Delete %1$s" ON public.%1$I FOR DELETE USING (empresa_id = get_user_clinica_id())', tbl);
  END LOOP;
END;
$$;


-- ---- Tabelas com DELETE restrito a Gestor ----
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'consultas','despesas','despesas_recorrentes','leads',
    'pacientes','planos_tratamento','receitas','tarefas'
  ])
  LOOP
    -- Pula tabelas que não existem no banco
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation: Select %1$s" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation: Insert %1$s" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation: Update %1$s" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation: Delete %1$s" ON public.%1$I', tbl);

    EXECUTE format('CREATE POLICY "Tenant Isolation: Select %1$s" ON public.%1$I FOR SELECT USING (empresa_id = get_user_clinica_id())', tbl);
    EXECUTE format('CREATE POLICY "Tenant Isolation: Insert %1$s" ON public.%1$I FOR INSERT WITH CHECK (empresa_id = get_user_clinica_id())', tbl);
    EXECUTE format('CREATE POLICY "Tenant Isolation: Update %1$s" ON public.%1$I FOR UPDATE USING (empresa_id = get_user_clinica_id())', tbl);
    EXECUTE format('CREATE POLICY "Tenant Isolation: Delete %1$s" ON public.%1$I FOR DELETE USING (empresa_id = get_user_clinica_id() AND is_gestor())', tbl);
  END LOOP;
END;
$$;


-- ---- pessoas ----
DROP POLICY IF EXISTS "Tenant Isolation: Select pessoas" ON public.pessoas;
DROP POLICY IF EXISTS "Tenant Isolation: Insert pessoas" ON public.pessoas;
DROP POLICY IF EXISTS "Tenant Isolation: Update pessoas" ON public.pessoas;
DROP POLICY IF EXISTS "Tenant Isolation: Delete pessoas" ON public.pessoas;

CREATE POLICY "Tenant Isolation: Select pessoas" ON public.pessoas
  FOR SELECT USING (empresa_id = get_user_clinica_id());
CREATE POLICY "Tenant Isolation: Insert pessoas" ON public.pessoas
  FOR INSERT WITH CHECK (empresa_id = get_user_clinica_id());
CREATE POLICY "Tenant Isolation: Update pessoas" ON public.pessoas
  FOR UPDATE USING (empresa_id = get_user_clinica_id());
CREATE POLICY "Tenant Isolation: Delete pessoas" ON public.pessoas
  FOR DELETE USING (empresa_id = get_user_clinica_id() AND is_gestor());


-- ---- campos_categorias ----
DROP POLICY IF EXISTS "Tenant Isolation: Select campos_categorias" ON public.campos_categorias;
DROP POLICY IF EXISTS "Tenant Isolation: Insert campos_categorias" ON public.campos_categorias;
DROP POLICY IF EXISTS "Tenant Isolation: Update campos_categorias" ON public.campos_categorias;
DROP POLICY IF EXISTS "Tenant Isolation: Delete campos_categorias" ON public.campos_categorias;

CREATE POLICY "Tenant Isolation: Select campos_categorias" ON public.campos_categorias
  FOR SELECT USING (empresa_id = get_user_clinica_id());
CREATE POLICY "Tenant Isolation: Insert campos_categorias" ON public.campos_categorias
  FOR INSERT WITH CHECK (empresa_id = get_user_clinica_id());
CREATE POLICY "Tenant Isolation: Update campos_categorias" ON public.campos_categorias
  FOR UPDATE USING (empresa_id = get_user_clinica_id());
CREATE POLICY "Tenant Isolation: Delete campos_categorias" ON public.campos_categorias
  FOR DELETE USING (empresa_id = get_user_clinica_id());


-- ---- usuario_setores (acesso via subquery, sem empresa_id direto) ----
DROP POLICY IF EXISTS "Tenant Isolation: Select Usuario Setores" ON public.usuario_setores;
DROP POLICY IF EXISTS "Tenant Isolation: Insert Usuario Setores" ON public.usuario_setores;
DROP POLICY IF EXISTS "Tenant Isolation: Update Usuario Setores" ON public.usuario_setores;
DROP POLICY IF EXISTS "Tenant Isolation: Delete Usuario Setores" ON public.usuario_setores;

CREATE POLICY "Tenant Isolation: Select Usuario Setores" ON public.usuario_setores
  FOR SELECT USING (usuario_id IN (SELECT id FROM usuarios WHERE empresa_id = get_user_clinica_id()));
CREATE POLICY "Tenant Isolation: Insert Usuario Setores" ON public.usuario_setores
  FOR INSERT WITH CHECK (usuario_id IN (SELECT id FROM usuarios WHERE empresa_id = get_user_clinica_id()));
CREATE POLICY "Tenant Isolation: Update Usuario Setores" ON public.usuario_setores
  FOR UPDATE USING (usuario_id IN (SELECT id FROM usuarios WHERE empresa_id = get_user_clinica_id()));
CREATE POLICY "Tenant Isolation: Delete Usuario Setores" ON public.usuario_setores
  FOR DELETE USING (usuario_id IN (SELECT id FROM usuarios WHERE empresa_id = get_user_clinica_id()));


-- ---- chat_modelos_mensagem (acesso via subquery) ----
DROP POLICY IF EXISTS "Clinica members can view own templates" ON public.chat_modelos_mensagem;
DROP POLICY IF EXISTS "Clinica members can insert own templates" ON public.chat_modelos_mensagem;
DROP POLICY IF EXISTS "Clinica members can update own templates" ON public.chat_modelos_mensagem;
DROP POLICY IF EXISTS "Clinica members can delete own templates" ON public.chat_modelos_mensagem;

CREATE POLICY "Empresa members can view own templates" ON public.chat_modelos_mensagem
  FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));
CREATE POLICY "Empresa members can insert own templates" ON public.chat_modelos_mensagem
  FOR INSERT WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));
CREATE POLICY "Empresa members can update own templates" ON public.chat_modelos_mensagem
  FOR UPDATE USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));
CREATE POLICY "Empresa members can delete own templates" ON public.chat_modelos_mensagem
  FOR DELETE USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid()));


-- ---- supervisor_config ----
DROP POLICY IF EXISTS "supervisor_config_select" ON public.supervisor_config;
DROP POLICY IF EXISTS "supervisor_config_insert" ON public.supervisor_config;
DROP POLICY IF EXISTS "supervisor_config_update" ON public.supervisor_config;

CREATE POLICY "supervisor_config_select" ON public.supervisor_config
  FOR SELECT USING (empresa_id = (SELECT get_user_clinica_id()));
CREATE POLICY "supervisor_config_insert" ON public.supervisor_config
  FOR INSERT WITH CHECK (empresa_id = (SELECT get_user_clinica_id()));
CREATE POLICY "supervisor_config_update" ON public.supervisor_config
  FOR UPDATE USING (empresa_id = (SELECT get_user_clinica_id()));


-- ---- lead_etapa_historico (acesso via leads → empresa_id) ----
DROP POLICY IF EXISTS "Tenant Isolation: Select lead_etapa_historico" ON public.lead_etapa_historico;
DROP POLICY IF EXISTS "Tenant Isolation: Insert lead_etapa_historico" ON public.lead_etapa_historico;
DROP POLICY IF EXISTS "Tenant Isolation: Update lead_etapa_historico" ON public.lead_etapa_historico;
DROP POLICY IF EXISTS "Tenant Isolation: Delete lead_etapa_historico" ON public.lead_etapa_historico;

CREATE POLICY "Tenant Isolation: Select lead_etapa_historico" ON public.lead_etapa_historico
  FOR SELECT USING (lead_id IN (SELECT id FROM public.leads WHERE empresa_id = get_user_clinica_id()));
CREATE POLICY "Tenant Isolation: Insert lead_etapa_historico" ON public.lead_etapa_historico
  FOR INSERT WITH CHECK (lead_id IN (SELECT id FROM public.leads WHERE empresa_id = get_user_clinica_id()));
CREATE POLICY "Tenant Isolation: Update lead_etapa_historico" ON public.lead_etapa_historico
  FOR UPDATE USING (lead_id IN (SELECT id FROM public.leads WHERE empresa_id = get_user_clinica_id()));
CREATE POLICY "Tenant Isolation: Delete lead_etapa_historico" ON public.lead_etapa_historico
  FOR DELETE USING (lead_id IN (SELECT id FROM public.leads WHERE empresa_id = get_user_clinica_id()));


-- ---- campos_personalizados (acesso via campos_categorias → empresa_id) ----
DROP POLICY IF EXISTS "Tenant Isolation: Select campos_personalizados" ON public.campos_personalizados;
DROP POLICY IF EXISTS "Tenant Isolation: Insert campos_personalizados" ON public.campos_personalizados;
DROP POLICY IF EXISTS "Tenant Isolation: Update campos_personalizados" ON public.campos_personalizados;
DROP POLICY IF EXISTS "Tenant Isolation: Delete campos_personalizados" ON public.campos_personalizados;

CREATE POLICY "Tenant Isolation: Select campos_personalizados" ON public.campos_personalizados
  FOR SELECT USING (categoria_id IN (SELECT id FROM public.campos_categorias WHERE empresa_id = get_user_clinica_id()));
CREATE POLICY "Tenant Isolation: Insert campos_personalizados" ON public.campos_personalizados
  FOR INSERT WITH CHECK (categoria_id IN (SELECT id FROM public.campos_categorias WHERE empresa_id = get_user_clinica_id()));
CREATE POLICY "Tenant Isolation: Update campos_personalizados" ON public.campos_personalizados
  FOR UPDATE USING (categoria_id IN (SELECT id FROM public.campos_categorias WHERE empresa_id = get_user_clinica_id()));
CREATE POLICY "Tenant Isolation: Delete campos_personalizados" ON public.campos_personalizados
  FOR DELETE USING (categoria_id IN (SELECT id FROM public.campos_categorias WHERE empresa_id = get_user_clinica_id()));


-- ---- campos_valores (acesso via leads → empresa_id) ----
DROP POLICY IF EXISTS "Tenant Isolation: Select campos_valores" ON public.campos_valores;
DROP POLICY IF EXISTS "Tenant Isolation: Insert campos_valores" ON public.campos_valores;
DROP POLICY IF EXISTS "Tenant Isolation: Update campos_valores" ON public.campos_valores;
DROP POLICY IF EXISTS "Tenant Isolation: Delete campos_valores" ON public.campos_valores;

CREATE POLICY "Tenant Isolation: Select campos_valores" ON public.campos_valores
  FOR SELECT USING (lead_id IN (SELECT id FROM public.leads WHERE empresa_id = get_user_clinica_id()));
CREATE POLICY "Tenant Isolation: Insert campos_valores" ON public.campos_valores
  FOR INSERT WITH CHECK (lead_id IN (SELECT id FROM public.leads WHERE empresa_id = get_user_clinica_id()));
CREATE POLICY "Tenant Isolation: Update campos_valores" ON public.campos_valores
  FOR UPDATE USING (lead_id IN (SELECT id FROM public.leads WHERE empresa_id = get_user_clinica_id()));
CREATE POLICY "Tenant Isolation: Delete campos_valores" ON public.campos_valores
  FOR DELETE USING (lead_id IN (SELECT id FROM public.leads WHERE empresa_id = get_user_clinica_id()));


-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
