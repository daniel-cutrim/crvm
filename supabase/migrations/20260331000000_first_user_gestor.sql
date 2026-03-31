-- Migration para garantir que o 1º usuário de QUALQUER empresa (clinica) seja SEMPRE designado como 'Gestor'

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_clinica_id uuid;
  v_role text;
  v_count int;
  v_default_clinica uuid;
BEGIN
  -- 1. Tentar pegar o clinica_id caso venha nos metadados (como num convite de usuário futuro)
  v_clinica_id := (NEW.raw_user_meta_data->>'clinica_id')::uuid;
  
  -- 2. Se não veio clinica_id, localiza a clínica padrão.
  -- Em fluxos de SaaS recém criados, o ideal é criar a clínica. 
  -- Como o app já tem uma clínica base inserida na Seed, usamos ela como default.
  IF v_clinica_id IS NULL THEN
    SELECT id INTO v_default_clinica FROM public.clinica ORDER BY created_at ASC LIMIT 1;
    v_clinica_id := v_default_clinica;
    
    -- Se de tudo o banco estiver vazio sem nenhuma clínica, auto-cria uma nova para não falhar
    IF v_clinica_id IS NULL THEN
      INSERT INTO public.clinica (nome) 
      VALUES (COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)) || ' Odonto')
      RETURNING id INTO v_clinica_id;
    END IF;
  END IF;

  -- 3. Contar quantos usuários existem *especificamente para esta empresa/clínica*
  SELECT COUNT(*) INTO v_count FROM public.usuarios WHERE clinica_id = v_clinica_id;
  
  -- 4. REGRA DE NEGÓCIO: O 1º usuário da empresa É SEMPRE 'Gestor'
  IF v_count = 0 THEN
    v_role := 'Gestor';
  ELSE
    -- Se a empresa já tem usuários, respeita a role que foi selecionada na criação ou usa 'Recepção' de fallback
    v_role := COALESCE(NEW.raw_user_meta_data->>'papel', 'Recepção');
  END IF;

  -- 5. Insere no public.usuarios atrelando sempre ao clinica_id correto
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
$function$;
