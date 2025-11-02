-- Update search_crags_enhanced to include report counts
-- Drop existing function first since we're changing the return type
DROP FUNCTION IF EXISTS public.search_crags_enhanced(text);

CREATE OR REPLACE FUNCTION public.search_crags_enhanced(search_query text)
RETURNS TABLE(
  id text,
  name text,
  lat numeric,
  lon numeric,
  country text,
  state text,
  municipality text,
  village text,
  rock_type text,
  climbing_types text[],
  description text,
  source text,
  slug character varying,
  report_count bigint,
  match_score real,
  match_type text
)
LANGUAGE plpgsql
STABLE
AS $function$
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
    END::TEXT AS match_type
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
  ORDER BY
    match_score DESC,
    c.name ASC
  LIMIT 10;
END;
$function$;
