-- Restructure obvious sectors into proper crag->sector hierarchy
-- This migration creates parent crags and moves sector entries to sectors table

-- Step 1: Create parent crag for Fontainebleau with sandstone fragility info
INSERT INTO crags (id, name, lat, lon, country, rock_type, climbing_types, description, source, created_at, updated_at)
VALUES (
  'fontainebleau-parent',
  'Fontainebleau',
  48.4333, -- Center of Fontainebleau forest
  2.6333,
  'FR',
  'sandstone',
  ARRAY['boulder'],
  'Fontainebleau is one of the world''s premier bouldering destinations, located in a forest southeast of Paris. IMPORTANT: The sandstone here is extremely fragile when wet. Climbing on wet sandstone damages the rock permanently and accelerates erosion. Always check conditions and avoid climbing after rain or when holds are damp. Wait at least 24-48 hours after precipitation before climbing.',
  'manual',
  NOW(),
  NOW()
);

-- Step 2: Create parent crag for Chironico
INSERT INTO crags (id, name, lat, lon, country, rock_type, climbing_types, description, source, created_at, updated_at)
VALUES (
  'chironico-parent',
  'Chironico',
  46.4280, -- Average lat from sectors
  8.8650,  -- Average lon from sectors
  'CH',
  'granite',
  ARRAY['sport'],
  'Chironico is a world-class sport climbing destination in Ticino, Switzerland, known for its steep granite walls.',
  'manual',
  NOW(),
  NOW()
);

-- Step 3: Create parent crag for Burbage
INSERT INTO crags (id, name, lat, lon, country, rock_type, climbing_types, description, source, created_at, updated_at)
VALUES (
  'burbage-parent',
  'Burbage',
  53.3357, -- Average lat
  -1.6234, -- Average lon
  'GB',
  'gritstone',
  ARRAY['trad', 'boulder'],
  'Burbage is a classic gritstone edge in the Peak District, offering traditional climbing and bouldering.',
  'manual',
  NOW(),
  NOW()
);

-- Step 4: Move Fontainebleau sectors to sectors table
-- (Apremont, Franchard, Cuvier, Gorges du Houx, etc.)
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
  AND (
    name LIKE 'Apremont%'
    OR name LIKE 'Franchard%'
    OR name LIKE 'Cuvier%'
    OR name LIKE 'Gorges du Houx%'
    OR name LIKE 'Gorge aux Chats%'
    OR name LIKE 'Gorge aux Châts%'
    OR name LIKE 'Restant du Long Rocher%'
    OR name LIKE 'Rocher d''Avon%'
    OR name LIKE 'Rocher de Bouligny%'
    OR name LIKE 'Rocher Canon%'
  );

-- Step 5: Move Chironico sectors to sectors table
INSERT INTO sectors (id, crag_id, name, lat, lon, description, osm_id, osm_type, source, created_at, updated_at, last_synced_at)
SELECT
  id,
  'chironico-parent' as crag_id,
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
WHERE country = 'CH'
  AND name LIKE 'Chironico sector%';

-- Step 6: Move Burbage sectors to sectors table
INSERT INTO sectors (id, crag_id, name, lat, lon, description, osm_id, osm_type, source, created_at, updated_at, last_synced_at)
SELECT
  id,
  'burbage-parent' as crag_id,
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
WHERE country = 'GB'
  AND name LIKE 'Burbage%';

-- Step 7: Delete moved entries from crags table
DELETE FROM crags
WHERE country = 'FR'
  AND (
    name LIKE 'Apremont%'
    OR name LIKE 'Franchard%'
    OR name LIKE 'Cuvier%'
    OR name LIKE 'Gorges du Houx%'
    OR name LIKE 'Gorge aux Chats%'
    OR name LIKE 'Gorge aux Châts%'
    OR name LIKE 'Restant du Long Rocher%'
    OR name LIKE 'Rocher d''Avon%'
    OR name LIKE 'Rocher de Bouligny%'
    OR name LIKE 'Rocher Canon%'
  );

DELETE FROM crags
WHERE country = 'CH'
  AND name LIKE 'Chironico sector%';

DELETE FROM crags
WHERE country = 'GB'
  AND name LIKE 'Burbage%';
