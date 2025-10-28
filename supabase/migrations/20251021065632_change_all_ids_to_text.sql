-- Change all ID columns from UUID to TEXT to support OSM IDs
-- Drop all foreign key constraints first
ALTER TABLE sectors DROP CONSTRAINT IF EXISTS sectors_crag_id_fkey;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_crag_id_fkey;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_sector_id_fkey;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_route_id_fkey;
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_sector_id_fkey;

-- Change column types
ALTER TABLE crags ALTER COLUMN id TYPE TEXT;
ALTER TABLE sectors ALTER COLUMN id TYPE TEXT;
ALTER TABLE sectors ALTER COLUMN crag_id TYPE TEXT;
ALTER TABLE routes ALTER COLUMN id TYPE TEXT;
ALTER TABLE routes ALTER COLUMN sector_id TYPE TEXT;
ALTER TABLE reports ALTER COLUMN crag_id TYPE TEXT;
ALTER TABLE reports ALTER COLUMN sector_id TYPE TEXT;
ALTER TABLE reports ALTER COLUMN route_id TYPE TEXT;

-- Recreate foreign key constraints
ALTER TABLE sectors ADD CONSTRAINT sectors_crag_id_fkey FOREIGN KEY (crag_id) REFERENCES crags(id) ON DELETE CASCADE;
ALTER TABLE routes ADD CONSTRAINT routes_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES sectors(id) ON DELETE CASCADE;
ALTER TABLE reports ADD CONSTRAINT reports_crag_id_fkey FOREIGN KEY (crag_id) REFERENCES crags(id) ON DELETE SET NULL;
ALTER TABLE reports ADD CONSTRAINT reports_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES sectors(id) ON DELETE SET NULL;
ALTER TABLE reports ADD CONSTRAINT reports_route_id_fkey FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL;
