-- Update search_locations_enhanced to work with unified crag/sector architecture
-- Sectors are now crags with parent_crag_id set

DROP FUNCTION IF EXISTS search_locations_enhanced(text);

CREATE OR REPLACE FUNCTION search_locations_enhanced(search_query TEXT)
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
  slug TEXT,
  report_count BIGINT,
  match_score REAL,
  match_type TEXT,
  result_type TEXT,
  parent_crag_name TEXT,
  parent_crag_id TEXT,
  parent_crag_slug TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_query TEXT;
BEGIN
  -- Normalize query: lowercase, remove accents, trim
  normalized_query := immutable_unaccent(LOWER(TRIM(search_query)));

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.lat,
    c.lon,
    COALESCE(c.country, pc.country) as country,
    COALESCE(c.state, pc.state) as state,
    COALESCE(c.municipality, pc.municipality) as municipality,
    COALESCE(c.village, pc.village) as village,
    COALESCE(c.rock_type, pc.rock_type) as rock_type,
    COALESCE(c.climbing_types, pc.climbing_types) as climbing_types,
    c.description,
    c.source,
    c.slug::TEXT,
    -- Count reports for this crag/sector
    COUNT(r.id)::bigint AS report_count,
    -- Calculate match score (higher = better)
    GREATEST(
      -- Exact match (after normalization) = 1.0
      CASE
        WHEN immutable_unaccent(LOWER(c.name)) = normalized_query THEN 1.0
        ELSE 0.0
      END,
      -- Starts with query = 0.9
      CASE
        WHEN immutable_unaccent(LOWER(c.name)) LIKE normalized_query || '%' THEN 0.9
        ELSE 0.0
      END,
      -- Contains query = 0.7
      CASE
        WHEN immutable_unaccent(LOWER(c.name)) LIKE '%' || normalized_query || '%' THEN 0.7
        ELSE 0.0
      END,
      -- Trigram similarity (handles typos) = 0.0-0.6
      CASE
        WHEN similarity(immutable_unaccent(LOWER(c.name)), normalized_query) > 0.3
        THEN similarity(immutable_unaccent(LOWER(c.name)), normalized_query) * 0.6
        ELSE 0.0
      END,
      -- Parent crag name match (for sectors) = 0.4
      CASE
        WHEN pc.name IS NOT NULL AND immutable_unaccent(LOWER(pc.name)) LIKE '%' || normalized_query || '%' THEN 0.4
        ELSE 0.0
      END,
      -- Location match (lower priority) = 0.3-0.5
      CASE
        WHEN immutable_unaccent(LOWER(COALESCE(c.municipality, pc.municipality, ''))) LIKE '%' || normalized_query || '%' THEN 0.5
        WHEN immutable_unaccent(LOWER(COALESCE(c.state, pc.state, ''))) LIKE '%' || normalized_query || '%' THEN 0.4
        WHEN immutable_unaccent(LOWER(COALESCE(c.country, pc.country, ''))) = normalized_query THEN 0.3
        ELSE 0.0
      END
    )::REAL AS match_score,
    -- Describe match type for debugging
    CASE
      WHEN immutable_unaccent(LOWER(c.name)) = normalized_query THEN 'exact'
      WHEN immutable_unaccent(LOWER(c.name)) LIKE normalized_query || '%' THEN 'prefix'
      WHEN immutable_unaccent(LOWER(c.name)) LIKE '%' || normalized_query || '%' THEN 'contains'
      WHEN similarity(immutable_unaccent(LOWER(c.name)), normalized_query) > 0.3 THEN 'fuzzy'
      WHEN pc.name IS NOT NULL AND immutable_unaccent(LOWER(pc.name)) LIKE '%' || normalized_query || '%' THEN 'parent'
      ELSE 'location'
    END::TEXT AS match_type,
    -- Determine if this is a crag or sector
    CASE
      WHEN c.parent_crag_id IS NOT NULL THEN 'sector'
      ELSE 'crag'
    END::TEXT as result_type,
    pc.name as parent_crag_name,
    pc.id as parent_crag_id,
    pc.slug::TEXT as parent_crag_slug
  FROM crags c
  LEFT JOIN crags pc ON c.parent_crag_id = pc.id
  LEFT JOIN reports r ON r.crag_id = c.id
  WHERE
    -- Match name (with unaccent)
    immutable_unaccent(LOWER(c.name)) LIKE '%' || normalized_query || '%'
    -- OR match parent crag name (for sectors)
    OR (pc.name IS NOT NULL AND immutable_unaccent(LOWER(pc.name)) LIKE '%' || normalized_query || '%')
    -- OR match location
    OR immutable_unaccent(LOWER(COALESCE(c.country, pc.country, ''))) LIKE '%' || normalized_query || '%'
    OR immutable_unaccent(LOWER(COALESCE(c.state, pc.state, ''))) LIKE '%' || normalized_query || '%'
    OR immutable_unaccent(LOWER(COALESCE(c.municipality, pc.municipality, ''))) LIKE '%' || normalized_query || '%'
    -- OR fuzzy match (similarity > 0.3)
    OR similarity(immutable_unaccent(LOWER(c.name)), normalized_query) > 0.3
  GROUP BY
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
    c.slug,
    c.parent_crag_id,
    pc.id,
    pc.name,
    pc.country,
    pc.state,
    pc.municipality,
    pc.village,
    pc.rock_type,
    pc.climbing_types,
    pc.slug
  ORDER BY
    match_score DESC,
    c.name ASC
  LIMIT 10;
END;
$$;
