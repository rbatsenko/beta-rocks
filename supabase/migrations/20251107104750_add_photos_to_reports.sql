-- Add photos array column to reports table
-- This allows users to upload multiple photos with their reports

ALTER TABLE reports
ADD COLUMN photos TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add index for filtering reports with photos
CREATE INDEX idx_reports_has_photos ON reports((cardinality(photos) > 0));

-- Add comment explaining the column
COMMENT ON COLUMN reports.photos IS 'Array of photo storage paths in Supabase Storage (e.g., ["reports/profile-id-timestamp.webp"])';
