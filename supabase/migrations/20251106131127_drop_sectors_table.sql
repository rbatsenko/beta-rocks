-- Drop foreign key constraints from tables that referenced sectors
ALTER TABLE IF EXISTS routes DROP CONSTRAINT IF EXISTS routes_sector_id_fkey;
ALTER TABLE IF EXISTS reports DROP CONSTRAINT IF EXISTS reports_sector_id_fkey;

-- Drop the old sectors table
DROP TABLE IF EXISTS sectors;
