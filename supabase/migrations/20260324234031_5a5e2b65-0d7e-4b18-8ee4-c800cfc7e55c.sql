
-- Add sequential patient code column
ALTER TABLE public.pacientes ADD COLUMN codigo_paciente TEXT UNIQUE;

-- Create sequence for patient codes
CREATE SEQUENCE IF NOT EXISTS pacientes_codigo_seq START 1;

-- Set existing patients with sequential codes
DO $$
DECLARE
  rec RECORD;
  seq_val INTEGER := 0;
BEGIN
  FOR rec IN SELECT id FROM public.pacientes ORDER BY created_at ASC
  LOOP
    seq_val := seq_val + 1;
    UPDATE public.pacientes SET codigo_paciente = LPAD(seq_val::TEXT, 5, '0') WHERE id = rec.id;
  END LOOP;
  -- Set sequence to next value
  IF seq_val > 0 THEN
    PERFORM setval('pacientes_codigo_seq', seq_val);
  END IF;
END $$;

-- Create trigger function to auto-assign code on insert
CREATE OR REPLACE FUNCTION public.set_codigo_paciente()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.codigo_paciente IS NULL THEN
    NEW.codigo_paciente := LPAD(nextval('pacientes_codigo_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_codigo_paciente
  BEFORE INSERT ON public.pacientes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_codigo_paciente();
