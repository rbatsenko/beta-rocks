-- Add OSM-specific columns to sectors table
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS osm_id TEXT;
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS osm_type TEXT;
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE sectors ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;

-- Add OSM-specific columns to routes table
ALTER TABLE routes ADD COLUMN IF NOT EXISTS osm_id TEXT;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS osm_type TEXT;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE routes ADD COLUMN IF NOT EXISTS climbing_type TEXT; -- 'sport', 'trad', 'boulder', etc.
ALTER TABLE routes ADD COLUMN IF NOT EXISTS pitches INTEGER;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_sectors_osm_id ON sectors (osm_id);
CREATE INDEX IF NOT EXISTS idx_sectors_source ON sectors (source);
CREATE INDEX IF NOT EXISTS idx_routes_osm_id ON routes (osm_id);
CREATE INDEX IF NOT EXISTS idx_routes_source ON routes (source);
