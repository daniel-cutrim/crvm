-- Migration para suportar múltiplas especialidades (clínica geral, odontologia, etc)

-- 1. Adicionar tipo_especialidade na clinica
ALTER TABLE public.clinica ADD COLUMN IF NOT EXISTS tipo_especialidade TEXT DEFAULT 'geral';

-- 2. Adicionar especialidade nos usuários (útil para clínicas com vários tipos de profissionais)
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS especialidade TEXT;

-- 3. Migrar dados existentes: como o sistema até então era 100% odontológico, todas as clínicas atuais são odontológicas.
UPDATE public.clinica SET tipo_especialidade = 'odontologia' WHERE tipo_especialidade = 'geral';

-- 4. Migrar papeis: Dentista passa a ser Profissional de forma genérica.
UPDATE public.usuarios SET especialidade = 'Dentista', papel = 'Profissional' WHERE papel = 'Dentista';
UPDATE public.usuarios SET especialidade = 'Dentista', papel = 'Gestor/Profissional' WHERE papel = 'Gestor/Dentista';

-- 5. Atualizar função de criação do primeiro usuário do Tenant para capturar o tipo de especialidade no ato do signup.
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
  v_tipo_especialidade text;
BEGIN
  -- 1. Verifica se recebemos um ID de clínica (ex: convite gerado pelo painel com meta-data)
  v_clinica_id := (NEW.raw_user_meta_data->>'clinica_id')::uuid;
  
  -- Captura tipo de especialidade vinda do auth signup metadata
  v_tipo_especialidade := COALESCE(NEW.raw_user_meta_data->>'tipo_especialidade', 'geral');

  -- 2. Se o ID for NULL (ex: você criou direto pelo Authentication Dashboard ou tela inicial),
  -- o sistema deve considerar isso como um NOVO cadastro criando uma NOVA EMPRESA (Tenant).
  IF v_clinica_id IS NULL THEN
    INSERT INTO public.clinica (nome, tipo_especialidade) 
    VALUES (
      'Clínica de ' || COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
      v_tipo_especialidade
    )
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
