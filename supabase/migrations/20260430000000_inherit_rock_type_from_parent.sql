-- Sector crags often have null rock_type / empty climbing_types because OSM
-- ingest only tags the parent area (e.g. "Fontainebleau" carries
-- rock_type='sandstone' and climbing_types=['boulder'], while individual
-- sectors like "Cuvier Bellevue" carry nulls). The data is always derivable
-- from the linked parent_crag_id but until now nothing exposed that.
--
-- This migration updates search_crags_enhanced to COALESCE from the parent
-- at query time, so sectors surface the right chip without requiring stored
-- values to be backfilled. The one-time data backfill is run manually outside
-- this migration.

-- Drop first because we're keeping the existing return-table column types
-- (NUMERIC for lat/lon, VARCHAR for slug) as deployed by 20251102213609_*,
-- and CREATE OR REPLACE FUNCTION refuses any change to those types — so
-- a clean drop sidesteps both the "change of return type" failure and the
-- search_path ambiguity Copilot flagged.
DROP FUNCTION IF EXISTS public.search_crags_enhanced(text);

CREATE OR REPLACE FUNCTION public.search_crags_enhanced(search_query TEXT)
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
  slug VARCHAR,
  report_count BIGINT,
  match_score REAL,
  match_type TEXT
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  normalized_query TEXT;
BEGIN
  normalized_query := immutable_unaccent(LOWER(search_query));
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
    -- Inherit from parent when sector's own value is empty.
    COALESCE(c.rock_type, parent.rock_type) AS rock_type,
    CASE
      WHEN c.climbing_types IS NOT NULL AND cardinality(c.climbing_types) > 0 THEN c.climbing_types
      ELSE COALESCE(parent.climbing_types, c.climbing_types)
    END AS climbing_types,
    c.description,
    c.source,
    c.slug,
    COUNT(r.id)::bigint AS report_count,
    GREATEST(
      CASE WHEN immutable_unaccent(LOWER(c.name)) = normalized_query THEN 1.0 ELSE 0.0 END,
      CASE WHEN immutable_unaccent(LOWER(c.name)) LIKE normalized_query || '%' THEN 0.9 ELSE 0.0 END,
      CASE WHEN immutable_unaccent(LOWER(c.name)) LIKE '%' || normalized_query || '%' THEN 0.7 ELSE 0.0 END,
      CASE
        WHEN similarity(immutable_unaccent(LOWER(c.name)), normalized_query) > 0.3
        THEN similarity(immutable_unaccent(LOWER(c.name)), normalized_query) * 0.6
        ELSE 0.0
      END,
      CASE
        WHEN immutable_unaccent(LOWER(COALESCE(c.municipality, ''))) LIKE '%' || normalized_query || '%' THEN 0.5
        WHEN immutable_unaccent(LOWER(COALESCE(c.state, ''))) LIKE '%' || normalized_query || '%' THEN 0.4
        WHEN immutable_unaccent(LOWER(COALESCE(c.country, ''))) = normalized_query THEN 0.3
        ELSE 0.0
      END
    )::REAL AS match_score,
    CASE
      WHEN immutable_unaccent(LOWER(c.name)) = normalized_query THEN 'exact'
      WHEN immutable_unaccent(LOWER(c.name)) LIKE normalized_query || '%' THEN 'prefix'
      WHEN immutable_unaccent(LOWER(c.name)) LIKE '%' || normalized_query || '%' THEN 'contains'
      WHEN similarity(immutable_unaccent(LOWER(c.name)), normalized_query) > 0.3 THEN 'fuzzy'
      ELSE 'location'
    END::TEXT AS match_type
  FROM crags c
  -- Only inherit from a non-secret parent: secret crags' attributes must
  -- not leak into public sector results.
  LEFT JOIN crags parent
    ON parent.id = c.parent_crag_id AND parent.is_secret = false
  LEFT JOIN reports r ON r.crag_id = c.id
  WHERE
    immutable_unaccent(LOWER(c.name)) LIKE '%' || normalized_query || '%'
    OR immutable_unaccent(LOWER(COALESCE(c.country, ''))) LIKE '%' || normalized_query || '%'
    OR immutable_unaccent(LOWER(COALESCE(c.state, ''))) LIKE '%' || normalized_query || '%'
    OR immutable_unaccent(LOWER(COALESCE(c.municipality, ''))) LIKE '%' || normalized_query || '%'
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
    parent.rock_type,
    parent.climbing_types
  ORDER BY
    match_score DESC,
    c.name ASC
  LIMIT 10;
END;
$$;

COMMENT ON FUNCTION search_crags_enhanced(TEXT) IS
  'Enhanced crag search with fuzzy matching, similarity scoring, report counts, and parent-crag rock_type / climbing_types fallback';
