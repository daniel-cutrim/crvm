DROP POLICY IF EXISTS "Gestores e Recepção podem ver leads" ON public.leads;

CREATE POLICY "Equipe pode ver leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  is_gestor()
  OR get_user_role() = 'Recepção'
  OR is_dentista()
);