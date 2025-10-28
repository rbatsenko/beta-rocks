
-- Add location enrichment columns
ALTER TABLE crags ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE crags ADD COLUMN IF NOT EXISTS municipality TEXT;

-- Add index for filtering by country/state
CREATE INDEX IF NOT EXISTS idx_crags_country ON crags (country);
CREATE INDEX IF NOT EXISTS idx_crags_state ON crags (state);
