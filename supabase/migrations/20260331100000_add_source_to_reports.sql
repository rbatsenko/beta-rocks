-- Add source column to reports table to track where reports come from (e.g., 'web', 'mobile', 'climbingpartner')
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS source TEXT;

-- Add index for filtering by source
CREATE INDEX IF NOT EXISTS idx_reports_source ON public.reports(source);
