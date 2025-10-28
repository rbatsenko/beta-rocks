-- Create a PostgreSQL function for accent-insensitive crag search
-- This allows searching for "Apremont Desert" to match "Apremont Désert"

CREATE OR REPLACE FUNCTION public.search_crags_unaccent(search_query TEXT)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  lat NUMERIC,
  lon NUMERIC,
  country TEXT,
  state TEXT,
  municipality TEXT,
  village TEXT,
  rock_type TEXT,
  osm_id TEXT,
  osm_type TEXT,
  source TEXT,
  climbing_types TEXT[],
  aspects NUMERIC[],
  description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    id,
    name,
    lat,
    lon,
    country,
    state,
    municipality,
    village,
    rock_type,
    osm_id,
    osm_type,
    source,
    climbing_types,
    aspects,
    description,
    created_at,
    updated_at,
    last_synced_at
  FROM crags
  WHERE
    immutable_unaccent(name) ILIKE '%' || immutable_unaccent(search_query) || '%'
    OR immutable_unaccent(country) ILIKE '%' || immutable_unaccent(search_query) || '%'
    OR immutable_unaccent(COALESCE(state, '')) ILIKE '%' || immutable_unaccent(search_query) || '%'
    OR immutable_unaccent(COALESCE(municipality, '')) ILIKE '%' || immutable_unaccent(search_query) || '%'
  ORDER BY
    -- Prioritize exact matches (after unaccent)
    CASE
      WHEN immutable_unaccent(name) ILIKE immutable_unaccent(search_query) THEN 1
      WHEN immutable_unaccent(name) ILIKE immutable_unaccent(search_query) || '%' THEN 2
      ELSE 3
    END,
    name
  LIMIT 10;
$$;
