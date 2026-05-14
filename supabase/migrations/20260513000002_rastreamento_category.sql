-- Add is_sistema flag to categorias and campos
ALTER TABLE campos_categorias ADD COLUMN IF NOT EXISTS is_sistema boolean NOT NULL DEFAULT false;
ALTER TABLE campos_personalizados ADD COLUMN IF NOT EXISTS is_sistema boolean NOT NULL DEFAULT false;

-- Create Rastreamento category for every existing tenant
DO $$
DECLARE
  clinica_record RECORD;
  cat_id uuid;
BEGIN
  FOR clinica_record IN SELECT id FROM clinica LOOP
    IF NOT EXISTS (
      SELECT 1 FROM campos_categorias
      WHERE clinica_id = clinica_record.id AND nome = 'Rastreamento' AND is_sistema = true
    ) THEN
      INSERT INTO campos_categorias (clinica_id, nome, funis_ids, ordem, is_sistema)
      VALUES (clinica_record.id, 'Rastreamento', '{}', 0, true)
      RETURNING id INTO cat_id;

      INSERT INTO campos_personalizados (categoria_id, nome, tipo, opcoes_lista, obrigatorio, ordem, is_sistema)
      VALUES
        (cat_id, 'utm_campaign', 'texto', NULL, false, 1, true),
        (cat_id, 'utm_medium',   'texto', NULL, false, 2, true),
        (cat_id, 'utm_content',  'texto', NULL, false, 3, true),
        (cat_id, 'utm_term',     'texto', NULL, false, 4, true);
    END IF;
  END LOOP;
END $$;

-- Auto-create Rastreamento for new tenants
CREATE OR REPLACE FUNCTION create_rastreamento_for_new_clinica()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE cat_id uuid;
BEGIN
  INSERT INTO campos_categorias (clinica_id, nome, funis_ids, ordem, is_sistema)
  VALUES (NEW.id, 'Rastreamento', '{}', 0, true)
  RETURNING id INTO cat_id;

  INSERT INTO campos_personalizados (categoria_id, nome, tipo, opcoes_lista, obrigatorio, ordem, is_sistema)
  VALUES
    (cat_id, 'utm_campaign', 'texto', NULL, false, 1, true),
    (cat_id, 'utm_medium',   'texto', NULL, false, 2, true),
    (cat_id, 'utm_content',  'texto', NULL, false, 3, true),
    (cat_id, 'utm_term',     'texto', NULL, false, 4, true);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_create_rastreamento ON clinica;
CREATE TRIGGER auto_create_rastreamento
  AFTER INSERT ON clinica
  FOR EACH ROW
  EXECUTE FUNCTION create_rastreamento_for_new_clinica();
