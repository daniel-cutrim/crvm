DO $$ 
DECLARE
    r record;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 2. CREATE AUTO-TENANT TRIGGER FUNCTION
-- Essa funcao auto-injeta o clinica_id caso o frontend esqueca de enviar no INSERT
CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_clinica uuid;
BEGIN
  v_user_clinica := public.get_user_clinica_id();
  IF NEW.clinica_id IS NULL AND v_user_clinica IS NOT NULL THEN
    NEW.clinica_id := v_user_clinica;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. CREATE TENANT ISOLATION POLICIES FOR ALL TABLES

CREATE POLICY "Tenant Isolation: Select Clinica" ON public.clinica FOR SELECT USING (id = get_user_clinica_id());
CREATE POLICY "Tenant Isolation: Update Clinica" ON public.clinica FOR UPDATE USING (id = get_user_clinica_id() AND is_gestor());
CREATE POLICY "Tenant Isolation: Delete Clinica" ON public.clinica FOR DELETE USING (id = get_user_clinica_id() AND is_gestor());

CREATE POLICY "Tenant Isolation: Select Usuario Setores" ON public.usuario_setores FOR SELECT USING (
  usuario_id IN (SELECT id FROM public.usuarios WHERE clinica_id = get_user_clinica_id())
);
CREATE POLICY "Tenant Isolation: Insert Usuario Setores" ON public.usuario_setores FOR INSERT WITH CHECK (
  usuario_id IN (SELECT id FROM public.usuarios WHERE clinica_id = get_user_clinica_id())
);
CREATE POLICY "Tenant Isolation: Update Usuario Setores" ON public.usuario_setores FOR UPDATE USING (
  usuario_id IN (SELECT id FROM public.usuarios WHERE clinica_id = get_user_clinica_id())
);
CREATE POLICY "Tenant Isolation: Delete Usuario Setores" ON public.usuario_setores FOR DELETE USING (
  usuario_id IN (SELECT id FROM public.usuarios WHERE clinica_id = get_user_clinica_id())
);

DO $$ 
DECLARE
    t_name text;
    tables text[] := ARRAY[
        'usuarios', 'leads', 'leads_historico', 'consultas', 'receitas', 
        'planos_tratamento_itens', 'notification_settings', 'paciente_documentos', 
        'planos_tratamento', 'prontuario_entradas', 'tarefas', 'marketing_investimentos', 
        'marketing_metas', 'odontograma_entradas', 'chat_mensagens', 'chat_conversas', 
        'automacao_mensagens', 'despesas', 'despesas_recorrentes', 'pacientes', 
        'procedimentos_padrao', 'system_logs', 'lead_jornada', 'integracoes', 
        'setores', 'funis', 'funil_etapas', 'auth_google_agenda'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables LOOP
        -- Anexa trigger para auto-injetar clinica_id no backend
        EXECUTE format('DROP TRIGGER IF EXISTS ensure_tenant_%I ON public.%I', t_name, t_name);
        EXECUTE format('CREATE TRIGGER ensure_tenant_%I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id()', t_name, t_name);

        -- Inclusao de RLS Policies
        EXECUTE format('CREATE POLICY "Tenant Isolation: Select %I" ON public.%I FOR SELECT USING (clinica_id = get_user_clinica_id())', t_name, t_name);
        EXECUTE format('CREATE POLICY "Tenant Isolation: Insert %I" ON public.%I FOR INSERT WITH CHECK (clinica_id = get_user_clinica_id())', t_name, t_name);
        EXECUTE format('CREATE POLICY "Tenant Isolation: Update %I" ON public.%I FOR UPDATE USING (clinica_id = get_user_clinica_id())', t_name, t_name);
        
        IF t_name IN ('pacientes', 'consultas', 'leads', 'receitas', 'planos_tratamento', 'usuarios', 'despesas', 'despesas_recorrentes') THEN
            EXECUTE format('CREATE POLICY "Tenant Isolation: Delete %I" ON public.%I FOR DELETE USING (clinica_id = get_user_clinica_id() AND is_gestor())', t_name, t_name);
        ELSE 
            EXECUTE format('CREATE POLICY "Tenant Isolation: Delete %I" ON public.%I FOR DELETE USING (clinica_id = get_user_clinica_id())', t_name, t_name);
        END IF;
    END LOOP;
END $$;
