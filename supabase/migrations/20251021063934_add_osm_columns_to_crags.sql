-- Enable full-text search extension first
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add OSM-specific columns to crags table
ALTER TABLE crags ADD COLUMN IF NOT EXISTS osm_id TEXT;
ALTER TABLE crags ADD COLUMN IF NOT EXISTS osm_type TEXT;
ALTER TABLE crags ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE crags ADD COLUMN IF NOT EXISTS climbing_types TEXT[];
ALTER TABLE crags ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE crags ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_crags_name_trgm ON crags USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_crags_source ON crags (source);
CREATE INDEX IF NOT EXISTS idx_crags_osm_id ON crags (osm_id);
