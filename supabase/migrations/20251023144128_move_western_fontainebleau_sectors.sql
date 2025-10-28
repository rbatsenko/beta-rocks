-- Move western Fontainebleau area boulder sectors by geographic coordinates
-- This captures western outlying areas like Étampes, Chamarande, etc.
-- Western bounds: lat 48.3-48.6, lon 2.1-2.4

-- Step 1: Move all western Fontainebleau area boulder crags to sectors table
INSERT INTO sectors (id, crag_id, name, lat, lon, description, osm_id, osm_type, source, created_at, updated_at, last_synced_at)
SELECT
  id,
  'fontainebleau-parent' as crag_id,
  name,
  lat,
  lon,
  description,
  osm_id,
  osm_type,
  source,
  created_at,
  updated_at,
  last_synced_at
FROM crags
WHERE country = 'FR'
  AND lat BETWEEN 48.3 AND 48.6
  AND lon BETWEEN 2.1 AND 2.4
  AND climbing_types && ARRAY['boulder']
  AND id != 'fontainebleau-parent'
  -- Exclude already moved sectors from previous migrations
  AND NOT EXISTS (
    SELECT 1 FROM sectors s WHERE s.id = crags.id
  );

-- Step 2: Delete moved entries from crags table
DELETE FROM crags
WHERE country = 'FR'
  AND lat BETWEEN 48.3 AND 48.6
  AND lon BETWEEN 2.1 AND 2.4
  AND climbing_types && ARRAY['boulder']
  AND id != 'fontainebleau-parent'
  -- Only delete if successfully moved to sectors
  AND EXISTS (
    SELECT 1 FROM sectors s WHERE s.id = crags.id
  );
