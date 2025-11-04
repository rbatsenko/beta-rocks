-- Deduplicate sectors in Fontainebleau
-- Strategy: Keep OSM sources over Boolder, keep older records for same-source duplicates

-- First, let's identify which sectors to keep and which to delete
WITH duplicate_sectors AS (
  SELECT
    s.id,
    s.name,
    s.crag_id,
    s.source,
    s.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY s.name, s.crag_id
      ORDER BY
        -- Prefer OSM over Boolder
        CASE
          WHEN s.source = 'osm' THEN 1
          WHEN s.source = 'boolder' THEN 2
          ELSE 3
        END,
        -- Then prefer older records
        s.created_at ASC,
        s.id ASC
    ) as row_num
  FROM sectors s
  WHERE s.crag_id = 'fontainebleau-parent'
),
sectors_to_delete AS (
  SELECT id, name, source
  FROM duplicate_sectors
  WHERE row_num > 1
)
-- Delete duplicate sectors
DELETE FROM sectors
WHERE id IN (SELECT id FROM sectors_to_delete);

-- Log what was deleted
DO $$
DECLARE
  deleted_count INT;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate Fontainebleau sectors', deleted_count;
END $$;
