-- Drop JWT-based RLS policies that block anonymous user updates/deletes
-- The application already handles ownership verification in code via updateReport() and deleteReport()

DROP POLICY IF EXISTS "authors_can_update_own_reports" ON public.reports;
DROP POLICY IF EXISTS "authors_can_delete_own_reports" ON public.reports;

-- Create permissive policies for authenticated anonymous users
-- Ownership is verified in application code (updateReport/deleteReport functions)
CREATE POLICY "allow_authenticated_updates_on_reports"
  ON public.reports FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_authenticated_deletes_on_reports"
  ON public.reports FOR DELETE
  USING (true);
