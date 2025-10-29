-- Add observed_at column to reports table
-- This allows users to specify when they observed the conditions (instead of just using created_at)

ALTER TABLE public.reports
ADD COLUMN observed_at TIMESTAMPTZ DEFAULT now();

-- Backfill existing reports to use created_at as observed_at
UPDATE public.reports
SET observed_at = created_at
WHERE observed_at IS NULL;

-- Make observed_at NOT NULL after backfill
ALTER TABLE public.reports
ALTER COLUMN observed_at SET NOT NULL;

-- Add index for sorting reports by observation time
CREATE INDEX idx_reports_observed_at ON public.reports(observed_at DESC);

-- Add comment explaining the column
COMMENT ON COLUMN public.reports.observed_at IS 'When the user observed these conditions (user-specified, defaults to now)';
