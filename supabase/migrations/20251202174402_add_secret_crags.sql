-- Add is_secret column to crags table for location-hidden crags
-- Secret crags only have name + country, no coordinates shown, weather from capital city

ALTER TABLE crags
ADD COLUMN is_secret boolean NOT NULL DEFAULT false;

-- Add comment explaining the column
COMMENT ON COLUMN crags.is_secret IS 'When true, coordinates are hidden from UI. Used for sensitive/closed crags that should not have exact location exposed.';

-- Create an index for filtering secret crags (useful for search exclusion if needed)
CREATE INDEX idx_crags_is_secret ON crags (is_secret) WHERE is_secret = true;
