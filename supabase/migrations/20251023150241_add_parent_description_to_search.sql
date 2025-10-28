-- Update search function to include parent crag description for sectors
-- This is critical for safety warnings like Fontainebleau sandstone fragility

-- Drop existing function first (changing return type requires drop)
DROP FUNCTION IF EXISTS public.search_locations_unaccent(TEXT);

CREATE OR REPLACE FUNCTION public.search_locations_unaccent(search_query TEXT)
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
  climbing_types TEXT[],
  description TEXT,
  source TEXT,
  result_type TEXT,
  parent_crag_name TEXT,
  parent_crag_id TEXT,
  parent_crag_description TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM (
    -- Search crags
    SELECT
      c.id,
      c.name,
      c.lat,
      c.lon,
      c.country,
      c.state,
      c.municipality,
      c.village,
      c.rock_type,
      c.climbing_types,
      c.description,
      c.source,
      'crag'::TEXT as result_type,
      NULL::TEXT as parent_crag_name,
      NULL::TEXT as parent_crag_id,
      NULL::TEXT as parent_crag_description
    FROM crags c
    WHERE
      immutable_unaccent(c.name) ILIKE '%' || immutable_unaccent(search_query) || '%'
      OR immutable_unaccent(c.country) ILIKE '%' || immutable_unaccent(search_query) || '%'
      OR immutable_unaccent(COALESCE(c.state, '')) ILIKE '%' || immutable_unaccent(search_query) || '%'
      OR immutable_unaccent(COALESCE(c.municipality, '')) ILIKE '%' || immutable_unaccent(search_query) || '%'

    UNION ALL

    -- Search sectors (with parent crag info including description)
    SELECT
      s.id,
      s.name,
      s.lat,
      s.lon,
      pc.country,
      pc.state,
      pc.municipality,
      pc.village,
      pc.rock_type,
      pc.climbing_types,
      s.description,
      s.source,
      'sector'::TEXT as result_type,
      pc.name as parent_crag_name,
      pc.id as parent_crag_id,
      pc.description as parent_crag_description
    FROM sectors s
    JOIN crags pc ON s.crag_id = pc.id
    WHERE
      immutable_unaccent(s.name) ILIKE '%' || immutable_unaccent(search_query) || '%'
      OR immutable_unaccent(pc.name) ILIKE '%' || immutable_unaccent(search_query) || '%'
  ) combined
  ORDER BY
    -- Prioritize exact matches
    CASE
      WHEN immutable_unaccent(name) ILIKE immutable_unaccent(search_query) THEN 1
      WHEN immutable_unaccent(name) ILIKE immutable_unaccent(search_query) || '%' THEN 2
      ELSE 3
    END,
    name
  LIMIT 10;
$$;
