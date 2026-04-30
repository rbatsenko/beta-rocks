-- Sector crags often have null rock_type / empty climbing_types because OSM
-- ingest only tags the parent area (e.g. "Fontainebleau" carries
-- rock_type='sandstone' and climbing_types=['boulder'], while individual
-- sectors like "Cuvier Bellevue" carry nulls). The data is always derivable
-- from the linked parent_crag_id but until now nothing exposed that.
--
-- This migration does two things:
--   1) Backfills the stored values so reads everywhere benefit (not just the
--      search RPC). Idempotent — only touches rows where the sector is empty
--      and the parent has data.
--   2) Updates search_crags_enhanced to COALESCE from the parent at query
--      time, so any future sectors imported without rock_type still surface
--      the right chip until the next backfill cycle.

-- =====================================================================
-- 1) Backfill
-- =====================================================================

UPDATE public.crags AS c
SET rock_type = p.rock_type
FROM public.crags AS p
WHERE c.parent_crag_id = p.id
  AND c.rock_type IS NULL
  AND p.rock_type IS NOT NULL;

UPDATE public.crags AS c
SET climbing_types = p.climbing_types
FROM public.crags AS p
WHERE c.parent_crag_id = p.id
  AND (c.climbing_types IS NULL OR cardinality(c.climbing_types) = 0)
  AND p.climbing_types IS NOT NULL
  AND cardinality(p.climbing_types) > 0;

-- =====================================================================
-- 2) Update search_crags_enhanced to coalesce from parent at query time
-- =====================================================================

CREATE OR REPLACE FUNCTION search_crags_enhanced(search_query TEXT)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
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
  LEFT JOIN crags parent ON parent.id = c.parent_crag_id
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
