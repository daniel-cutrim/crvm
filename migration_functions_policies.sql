-- ============================================================
-- CRM ODONTO - MIGRAÇÃO PARTE 2: FUNÇÕES, TRIGGERS, POLICIES,
-- ÍNDICES, STORAGE, REALTIME
-- ============================================================

-- ============================================================
-- PARTE 4: FUNÇÕES
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_clinica_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT clinica_id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT papel FROM public.usuarios WHERE auth_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE auth_user_id = auth.uid()
    AND (papel = 'Gestor' OR papel = 'Gestor/Dentista')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_dentista()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE auth_user_id = auth.uid() AND papel = 'Dentista')
$$;

CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_clinica uuid;
BEGIN
  v_user_clinica := public.get_user_clinica_id();
  IF NEW.clinica_id IS NULL AND v_user_clinica IS NOT NULL THEN
    NEW.clinica_id := v_user_clinica;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_codigo_paciente()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.codigo_paciente IS NULL THEN
    NEW.codigo_paciente := 'PAC-' || LPAD(nextval('paciente_codigo_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_clinica_id uuid;
  v_role text;
  v_count int;
BEGIN
  v_clinica_id := (NEW.raw_user_meta_data->>'clinica_id')::uuid;

  IF v_clinica_id IS NULL THEN
    INSERT INTO public.clinica (nome)
    VALUES ('Clínica de ' || COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)))
    RETURNING id INTO v_clinica_id;
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.usuarios WHERE clinica_id = v_clinica_id;

  IF v_count = 0 THEN
    v_role := 'Gestor';
  ELSE
    v_role := COALESCE(NEW.raw_user_meta_data->>'papel', 'Recepção');
  END IF;

  INSERT INTO public.usuarios (auth_user_id, nome, email, papel, clinica_id, ativo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_role,
    v_clinica_id,
    true
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_supervisor_config_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- PARTE 5: TRIGGERS
-- ============================================================

-- 5.1 Auth trigger (handle_new_user)
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5.2 Tenant isolation triggers (BEFORE INSERT)
CREATE OR REPLACE TRIGGER ensure_tenant_auth_google_agenda BEFORE INSERT ON public.auth_google_agenda FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_automacao_mensagens BEFORE INSERT ON public.automacao_mensagens FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_chat_conversas BEFORE INSERT ON public.chat_conversas FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_chat_mensagens BEFORE INSERT ON public.chat_mensagens FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_consultas BEFORE INSERT ON public.consultas FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_despesas BEFORE INSERT ON public.despesas FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_despesas_recorrentes BEFORE INSERT ON public.despesas_recorrentes FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_funil_etapas BEFORE INSERT ON public.funil_etapas FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_funis BEFORE INSERT ON public.funis FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_integracoes BEFORE INSERT ON public.integracoes FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_lead_jornada BEFORE INSERT ON public.lead_jornada FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_leads BEFORE INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_leads_historico BEFORE INSERT ON public.leads_historico FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_marketing_investimentos BEFORE INSERT ON public.marketing_investimentos FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_marketing_metas BEFORE INSERT ON public.marketing_metas FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_notification_settings BEFORE INSERT ON public.notification_settings FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_odontograma_entradas BEFORE INSERT ON public.odontograma_entradas FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_paciente_documentos BEFORE INSERT ON public.paciente_documentos FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_pacientes BEFORE INSERT ON public.pacientes FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_planos_tratamento BEFORE INSERT ON public.planos_tratamento FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_planos_tratamento_itens BEFORE INSERT ON public.planos_tratamento_itens FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_procedimentos_padrao BEFORE INSERT ON public.procedimentos_padrao FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_prontuario_entradas BEFORE INSERT ON public.prontuario_entradas FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_receitas BEFORE INSERT ON public.receitas FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_setores BEFORE INSERT ON public.setores FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_system_logs BEFORE INSERT ON public.system_logs FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_tarefas BEFORE INSERT ON public.tarefas FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE OR REPLACE TRIGGER ensure_tenant_usuarios BEFORE INSERT ON public.usuarios FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- 5.3 Outros triggers
CREATE OR REPLACE TRIGGER trg_set_codigo_paciente BEFORE INSERT ON public.pacientes FOR EACH ROW EXECUTE FUNCTION set_codigo_paciente();
CREATE OR REPLACE TRIGGER trg_supervisor_config_updated BEFORE UPDATE ON public.supervisor_config FOR EACH ROW EXECUTE FUNCTION update_supervisor_config_timestamp();

-- ============================================================
-- PARTE 6: RLS POLICIES
-- ============================================================

-- Macro para criar 4 policies padrão de tenant isolation
-- Aplicada manualmente para cada tabela abaixo

-- CLINICA
CREATE POLICY "Tenant Isolation: Select Clinica" ON public.clinica FOR SELECT USING (id = get_user_clinica_id());
CREATE POLICY "Tenant Isolation: Update Clinica" ON public.clinica FOR UPDATE USING (id = get_user_clinica_id() AND is_gestor());
CREATE POLICY "Tenant Isolation: Delete Clinica" ON public.clinica FOR DELETE USING (id = get_user_clinica_id() AND is_gestor());

-- USUARIOS
CREATE POLICY "Tenant Isolation: Select usuarios" ON public.usuarios FOR SELECT USING (clinica_id = get_user_clinica_id());
CREATE POLICY "Tenant Isolation: Insert usuarios" ON public.usuarios FOR INSERT WITH CHECK (clinica_id = get_user_clinica_id());
CREATE POLICY "Tenant Isolation: Update usuarios" ON public.usuarios FOR UPDATE USING (clinica_id = get_user_clinica_id());
CREATE POLICY "Tenant Isolation: Delete usuarios" ON public.usuarios FOR DELETE USING (clinica_id = get_user_clinica_id() AND is_gestor());

-- Tabelas com padrão: SELECT/INSERT/UPDATE/DELETE com clinica_id = get_user_clinica_id()
-- (sem restrição extra de is_gestor)
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
    EXECUTE format('CREATE POLICY "Tenant Isolation: Select %1$s" ON public.%1$I FOR SELECT USING (clinica_id = get_user_clinica_id())', tbl);
    EXECUTE format('CREATE POLICY "Tenant Isolation: Insert %1$s" ON public.%1$I FOR INSERT WITH CHECK (clinica_id = get_user_clinica_id())', tbl);
    EXECUTE format('CREATE POLICY "Tenant Isolation: Update %1$s" ON public.%1$I FOR UPDATE USING (clinica_id = get_user_clinica_id())', tbl);
    EXECUTE format('CREATE POLICY "Tenant Isolation: Delete %1$s" ON public.%1$I FOR DELETE USING (clinica_id = get_user_clinica_id())', tbl);
  END LOOP;
END;
$$;

-- Tabelas com DELETE restrito a Gestor
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'consultas','despesas','despesas_recorrentes','leads',
    'pacientes','planos_tratamento','receitas','tarefas'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "Tenant Isolation: Select %1$s" ON public.%1$I FOR SELECT USING (clinica_id = get_user_clinica_id())', tbl);
    EXECUTE format('CREATE POLICY "Tenant Isolation: Insert %1$s" ON public.%1$I FOR INSERT WITH CHECK (clinica_id = get_user_clinica_id())', tbl);
    EXECUTE format('CREATE POLICY "Tenant Isolation: Update %1$s" ON public.%1$I FOR UPDATE USING (clinica_id = get_user_clinica_id())', tbl);
    EXECUTE format('CREATE POLICY "Tenant Isolation: Delete %1$s" ON public.%1$I FOR DELETE USING (clinica_id = get_user_clinica_id() AND is_gestor())', tbl);
  END LOOP;
END;
$$;

-- USUARIO_SETORES (policy via subquery)
CREATE POLICY "Tenant Isolation: Select Usuario Setores" ON public.usuario_setores FOR SELECT USING (usuario_id IN (SELECT id FROM usuarios WHERE clinica_id = get_user_clinica_id()));
CREATE POLICY "Tenant Isolation: Insert Usuario Setores" ON public.usuario_setores FOR INSERT WITH CHECK (usuario_id IN (SELECT id FROM usuarios WHERE clinica_id = get_user_clinica_id()));
CREATE POLICY "Tenant Isolation: Update Usuario Setores" ON public.usuario_setores FOR UPDATE USING (usuario_id IN (SELECT id FROM usuarios WHERE clinica_id = get_user_clinica_id()));
CREATE POLICY "Tenant Isolation: Delete Usuario Setores" ON public.usuario_setores FOR DELETE USING (usuario_id IN (SELECT id FROM usuarios WHERE clinica_id = get_user_clinica_id()));

-- CHAT_MODELOS_MENSAGEM (policy via subquery)
CREATE POLICY "Clinica members can view own templates" ON public.chat_modelos_mensagem FOR SELECT USING (clinica_id IN (SELECT clinica_id FROM usuarios WHERE auth_user_id = auth.uid()));
CREATE POLICY "Clinica members can insert own templates" ON public.chat_modelos_mensagem FOR INSERT WITH CHECK (clinica_id IN (SELECT clinica_id FROM usuarios WHERE auth_user_id = auth.uid()));
CREATE POLICY "Clinica members can update own templates" ON public.chat_modelos_mensagem FOR UPDATE USING (clinica_id IN (SELECT clinica_id FROM usuarios WHERE auth_user_id = auth.uid()));
CREATE POLICY "Clinica members can delete own templates" ON public.chat_modelos_mensagem FOR DELETE USING (clinica_id IN (SELECT clinica_id FROM usuarios WHERE auth_user_id = auth.uid()));

-- SUPERVISOR_CONFIG
CREATE POLICY "supervisor_config_select" ON public.supervisor_config FOR SELECT USING (clinica_id = (SELECT get_user_clinica_id()));
CREATE POLICY "supervisor_config_insert" ON public.supervisor_config FOR INSERT WITH CHECK (clinica_id = (SELECT get_user_clinica_id()));
CREATE POLICY "supervisor_config_update" ON public.supervisor_config FOR UPDATE USING (clinica_id = (SELECT get_user_clinica_id()));

-- ============================================================
-- PARTE 7: ÍNDICES
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_auth_user_id ON public.usuarios (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_automacao_phone ON public.automacao_mensagens (phone);
CREATE INDEX IF NOT EXISTS idx_automacao_tipo_ref ON public.automacao_mensagens (tipo, referencia_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversas_phone ON public.chat_conversas (phone);
CREATE INDEX IF NOT EXISTS idx_chat_conversas_extraction ON public.chat_conversas (extraction_pending, ultima_mensagem_at) WHERE (extraction_pending = true);
CREATE INDEX IF NOT EXISTS idx_chat_conversas_supervisor ON public.chat_conversas (supervisor_enabled) WHERE (supervisor_enabled = true);
CREATE INDEX IF NOT EXISTS idx_chat_mensagens_conversa ON public.chat_mensagens (conversa_id, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_chat_modelos_clinica ON public.chat_modelos_mensagem (clinica_id);
CREATE INDEX IF NOT EXISTS idx_chat_modelos_atalho ON public.chat_modelos_mensagem (clinica_id, atalho) WHERE (atalho IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_consultas_lead_id ON public.consultas (lead_id);
CREATE INDEX IF NOT EXISTS idx_paciente_documentos_paciente_id ON public.paciente_documentos (paciente_id);
CREATE INDEX IF NOT EXISTS idx_planos_tratamento_itens_aprovado ON public.planos_tratamento_itens (plano_id, aprovado);
CREATE INDEX IF NOT EXISTS idx_supervisor_config_clinica ON public.supervisor_config (clinica_id);

-- ============================================================
-- PARTE 8: STORAGE BUCKETS + POLICIES
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('chat-audio', 'chat-audio', true, null, null),
  ('chat-media', 'chat-media', true, null, null),
  ('logos', 'logos', true, null, null),
  ('paciente-documentos', 'paciente-documentos', false, 52428800,
   ARRAY['application/pdf','image/jpeg','image/jpg','image/png','image/gif','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[])
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Anyone can read chat audio" ON storage.objects FOR SELECT USING (bucket_id = 'chat-audio');
CREATE POLICY "Authenticated users can upload audio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-audio');
CREATE POLICY "Authenticated users can delete audio" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-audio');
CREATE POLICY "Anyone can read logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Authenticated users can upload logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');
CREATE POLICY "Authenticated users can update logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'logos');
CREATE POLICY "Public read chat-media" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');
CREATE POLICY "Visualizar arquivos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'paciente-documentos');
CREATE POLICY "Upload de arquivos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'paciente-documentos');
CREATE POLICY "Deletar arquivos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'paciente-documentos');

-- ============================================================
-- PARTE 9: REALTIME PUBLICATIONS
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_mensagens;
