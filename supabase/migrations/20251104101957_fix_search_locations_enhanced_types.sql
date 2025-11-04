-- Fix type mismatch in search_locations_enhanced
DROP FUNCTION IF EXISTS search_locations_enhanced(TEXT);

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
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  normalized_query TEXT;
BEGIN
  -- Normalize query: remove accents, lowercase, handle abbreviations
  normalized_query := immutable_unaccent(LOWER(search_query));

  -- Replace common abbreviations
  normalized_query := REPLACE(normalized_query, 'st.', 'saint');
  normalized_query := REPLACE(normalized_query, 'st ', 'saint ');
  normalized_query := REPLACE(normalized_query, 'mt.', 'mont');
  normalized_query := REPLACE(normalized_query, 'mt ', 'mont ');

  RETURN QUERY
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
      c.slug,
      -- Count reports for this crag
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
        -- Location match (lower priority) = 0.5
        CASE
          WHEN immutable_unaccent(LOWER(COALESCE(c.municipality, ''))) LIKE '%' || normalized_query || '%' THEN 0.5
          WHEN immutable_unaccent(LOWER(COALESCE(c.state, ''))) LIKE '%' || normalized_query || '%' THEN 0.4
          WHEN immutable_unaccent(LOWER(COALESCE(c.country, ''))) = normalized_query THEN 0.3
          ELSE 0.0
        END
      )::REAL AS match_score,
      -- Describe match type for debugging
      CASE
        WHEN immutable_unaccent(LOWER(c.name)) = normalized_query THEN 'exact'
        WHEN immutable_unaccent(LOWER(c.name)) LIKE normalized_query || '%' THEN 'prefix'
        WHEN immutable_unaccent(LOWER(c.name)) LIKE '%' || normalized_query || '%' THEN 'contains'
        WHEN similarity(immutable_unaccent(LOWER(c.name)), normalized_query) > 0.3 THEN 'fuzzy'
        ELSE 'location'
      END::TEXT AS match_type,
      'crag'::TEXT as result_type,
      NULL::TEXT as parent_crag_name,
      NULL::TEXT as parent_crag_id,
      NULL::TEXT as parent_crag_slug
    FROM crags c
    LEFT JOIN reports r ON r.crag_id = c.id
    WHERE
      -- Match name (with unaccent)
      immutable_unaccent(LOWER(c.name)) LIKE '%' || normalized_query || '%'
      -- OR match location
      OR immutable_unaccent(LOWER(COALESCE(c.country, ''))) LIKE '%' || normalized_query || '%'
      OR immutable_unaccent(LOWER(COALESCE(c.state, ''))) LIKE '%' || normalized_query || '%'
      OR immutable_unaccent(LOWER(COALESCE(c.municipality, ''))) LIKE '%' || normalized_query || '%'
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
      c.slug

    UNION ALL

    -- Search sectors (with parent crag info)
    SELECT
      s.id,
      s.name,
      COALESCE(s.lat, pc.lat) as lat,
      COALESCE(s.lon, pc.lon) as lon,
      pc.country,
      pc.state,
      pc.municipality,
      pc.village,
      pc.rock_type,
      pc.climbing_types,
      s.description,
      s.source,
      NULL::TEXT as slug,
      -- Count reports for this sector
      COUNT(r.id)::bigint AS report_count,
      -- Calculate match score (same logic as crags)
      GREATEST(
        CASE
          WHEN immutable_unaccent(LOWER(s.name)) = normalized_query THEN 1.0
          ELSE 0.0
        END,
        CASE
          WHEN immutable_unaccent(LOWER(s.name)) LIKE normalized_query || '%' THEN 0.9
          ELSE 0.0
        END,
        CASE
          WHEN immutable_unaccent(LOWER(s.name)) LIKE '%' || normalized_query || '%' THEN 0.7
          ELSE 0.0
        END,
        CASE
          WHEN similarity(immutable_unaccent(LOWER(s.name)), normalized_query) > 0.3
          THEN similarity(immutable_unaccent(LOWER(s.name)), normalized_query) * 0.6
          ELSE 0.0
        END,
        -- Also match parent crag name (lower priority)
        CASE
          WHEN immutable_unaccent(LOWER(pc.name)) LIKE '%' || normalized_query || '%' THEN 0.4
          ELSE 0.0
        END
      )::REAL AS match_score,
      CASE
        WHEN immutable_unaccent(LOWER(s.name)) = normalized_query THEN 'exact'
        WHEN immutable_unaccent(LOWER(s.name)) LIKE normalized_query || '%' THEN 'prefix'
        WHEN immutable_unaccent(LOWER(s.name)) LIKE '%' || normalized_query || '%' THEN 'contains'
        WHEN similarity(immutable_unaccent(LOWER(s.name)), normalized_query) > 0.3 THEN 'fuzzy'
        ELSE 'parent'
      END::TEXT AS match_type,
      'sector'::TEXT as result_type,
      pc.name as parent_crag_name,
      pc.id as parent_crag_id,
      pc.slug as parent_crag_slug
    FROM sectors s
    JOIN crags pc ON s.crag_id = pc.id
    LEFT JOIN reports r ON r.sector_id = s.id
    WHERE
      -- Match sector name
      immutable_unaccent(LOWER(s.name)) LIKE '%' || normalized_query || '%'
      -- OR match parent crag name
      OR immutable_unaccent(LOWER(pc.name)) LIKE '%' || normalized_query || '%'
      -- OR fuzzy match
      OR similarity(immutable_unaccent(LOWER(s.name)), normalized_query) > 0.3
    GROUP BY
      s.id,
      s.name,
      s.lat,
      s.lon,
      s.description,
      s.source,
      pc.id,
      pc.name,
      pc.lat,
      pc.lon,
      pc.country,
      pc.state,
      pc.municipality,
      pc.village,
      pc.rock_type,
      pc.climbing_types,
      pc.slug
  ) combined
  ORDER BY
    match_score DESC,
    name ASC
  LIMIT 10;
END;
$$;

COMMENT ON FUNCTION search_locations_enhanced(TEXT) IS 'Enhanced search for both crags and sectors with fuzzy matching and similarity scoring';
