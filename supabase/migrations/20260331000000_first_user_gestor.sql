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
BEGIN
  -- 1. Verifica se recebemos um ID de clínica (ex: convite gerado pelo painel com meta-data)
  v_clinica_id := (NEW.raw_user_meta_data->>'clinica_id')::uuid;
  
  -- 2. Se o ID for NULL (ex: você criou direto pelo Authentication Dashboard ou tela inicial),
  -- o sistema deve considerar isso como um NOVO cadastro criando uma NOVA EMPRESA (Tenant).
  IF v_clinica_id IS NULL THEN
    INSERT INTO public.clinica (nome) 
    VALUES ('Clínica de ' || COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)))
    RETURNING id INTO v_clinica_id;
  END IF;

  -- 3. Contamos quantos usuários já existem NESSA clínica específica recém-criada
  SELECT COUNT(*) INTO v_count FROM public.usuarios WHERE clinica_id = v_clinica_id;
  
  -- 4. REGRA DE NEGÓCIO: O 1º usuário da empresa será SEMPRE Gestor.
  IF v_count = 0 THEN
    v_role := 'Gestor';
  ELSE
    v_role := COALESCE(NEW.raw_user_meta_data->>'papel', 'Recepção');
  END IF;

  -- 5. Inserimos o usuário corretamente atrelado à empresa
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
