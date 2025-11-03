-- Add expires_at field to reports for time-limited reports
-- Add RLS policies for update/delete operations (author only)

-- Add expires_at column (nullable, optional)
ALTER TABLE reports
ADD COLUMN expires_at TIMESTAMPTZ;

-- Add index on expires_at for efficient querying of expired reports
CREATE INDEX idx_reports_expires_at ON reports(expires_at);

-- Add comment explaining expires_at
COMMENT ON COLUMN reports.expires_at IS 'Optional expiry date after which the report is considered outdated. NULL means never expires.';

-- Add policy for authors to update their own reports
CREATE POLICY "authors_can_update_own_reports"
  ON public.reports FOR UPDATE
  USING (
    author_id IN (
      SELECT id FROM public.user_profiles
      WHERE sync_key_hash = current_setting('request.jwt.claim.sync_key_hash', true)
    )
  )
  WITH CHECK (
    author_id IN (
      SELECT id FROM public.user_profiles
      WHERE sync_key_hash = current_setting('request.jwt.claim.sync_key_hash', true)
    )
  );

-- Add policy for authors to delete their own reports
CREATE POLICY "authors_can_delete_own_reports"
  ON public.reports FOR DELETE
  USING (
    author_id IN (
      SELECT id FROM public.user_profiles
      WHERE sync_key_hash = current_setting('request.jwt.claim.sync_key_hash', true)
    )
  );

-- Note: Confirmations already have ON DELETE CASCADE, so they'll be auto-deleted
-- when a report is deleted (see initial schema)
