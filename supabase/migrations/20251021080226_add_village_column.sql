-- Add village column to crags table
ALTER TABLE crags ADD COLUMN IF NOT EXISTS village TEXT;

-- Add index for village searches
CREATE INDEX IF NOT EXISTS idx_crags_village ON crags (village);
