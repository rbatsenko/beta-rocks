-- Move remaining Fontainebleau boulder sectors by geographic coordinates
-- All bouldering in the Fontainebleau forest (lat 48.3-48.5, lon 2.5-2.8)
-- is in the same area with fragile sandstone

-- Step 1: Move all Fontainebleau area boulder crags to sectors table
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
  AND lat BETWEEN 48.3 AND 48.5
  AND lon BETWEEN 2.5 AND 2.8
  AND climbing_types && ARRAY['boulder']
  AND id != 'fontainebleau-parent'; -- Don't move the parent itself

-- Step 2: Delete moved entries from crags table
DELETE FROM crags
WHERE country = 'FR'
  AND lat BETWEEN 48.3 AND 48.5
  AND lon BETWEEN 2.5 AND 2.8
  AND climbing_types && ARRAY['boulder']
  AND id != 'fontainebleau-parent';
