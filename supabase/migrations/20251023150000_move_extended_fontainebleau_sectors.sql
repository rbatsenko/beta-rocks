-- Move extended Fontainebleau area boulder sectors by geographic coordinates
-- This captures outlying areas like Éléphant, Beauvais, Buthiers, Puiselet, etc.
-- Extended bounds: lat 48.2-48.6, lon 2.4-2.9 (wider than core Fontainebleau)

-- Step 1: Move all extended Fontainebleau area boulder crags to sectors table
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
  AND lat BETWEEN 48.2 AND 48.6
  AND lon BETWEEN 2.4 AND 2.9
  AND climbing_types && ARRAY['boulder']
  AND id != 'fontainebleau-parent'
  -- Exclude already moved sectors from previous migrations
  AND NOT EXISTS (
    SELECT 1 FROM sectors s WHERE s.id = crags.id
  );

-- Step 2: Delete moved entries from crags table
DELETE FROM crags
WHERE country = 'FR'
  AND lat BETWEEN 48.2 AND 48.6
  AND lon BETWEEN 2.4 AND 2.9
  AND climbing_types && ARRAY['boulder']
  AND id != 'fontainebleau-parent'
  -- Only delete if successfully moved to sectors
  AND EXISTS (
    SELECT 1 FROM sectors s WHERE s.id = crags.id
  );
