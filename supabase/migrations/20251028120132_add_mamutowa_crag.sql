-- Add Mamutowa crag (popular Polish limestone crag near Kraków)
-- Coordinates: 50.1703913°N, 19.8057149°E
-- Also known as "Mamut"

INSERT INTO crags (
  id,
  name,
  lat,
  lon,
  country,
  state,
  municipality,
  village,
  rock_type,
  source,
  description,
  created_at,
  updated_at
) VALUES (
  'manual_mamutowa_pl',
  'Mamut (Mamutowa)',
  50.1703913,
  19.8057149,
  'PL',
  'województwo małopolskie',
  'gmina Zabierzów',
  'Wierzchowie',
  'limestone',
  'manual',
  'Popular limestone crag in the Polish Jurassic Highland (Jura Krakowsko-Częstochowska), near Kraków.',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;
