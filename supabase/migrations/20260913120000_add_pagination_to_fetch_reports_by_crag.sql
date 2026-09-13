-- Add pagination (offset + total count) and category filtering to
-- fetch_reports_by_crag_sorted, and push expired reports to the end of the list so
-- stale entries fall onto later pages.
--
-- Previously the crag page could only ask for the first N reports with no way to
-- fetch the rest, and expired reports were interleaved with fresh ones.
--
-- Category filtering has to happen here rather than on the client: with the list
-- paginated, a client-side filter can only see the pages already loaded, so a
-- category whose reports all sit further down would look empty.

DROP FUNCTION IF EXISTS fetch_reports_by_crag_sorted(text, int);
DROP FUNCTION IF EXISTS fetch_reports_by_crag_sorted(text, int, int);
DROP FUNCTION IF EXISTS fetch_reports_by_crag_sorted(text, int, int, text);

CREATE OR REPLACE FUNCTION fetch_reports_by_crag_sorted(
  p_crag_id TEXT,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  crag_id TEXT,
  sector_id TEXT,
  route_id TEXT,
  author_id TEXT,
  category TEXT,
  text TEXT,
  rating_dry INT,
  rating_wind INT,
  rating_crowds INT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  observed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  lost_found_type TEXT,
  photos TEXT[],
  author JSONB,
  confirmations JSONB,
  location_info JSONB,
  total_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id::TEXT,
    r.crag_id::TEXT,
    r.sector_id::TEXT,
    r.route_id::TEXT,
    r.author_id::TEXT,
    r.category,
    r.text,
    r.rating_dry,
    r.rating_wind,
    r.rating_crowds,
    r.created_at,
    r.updated_at,
    r.observed_at,
    r.expires_at,
    r.lost_found_type,
    r.photos,
    jsonb_build_object(
      'id', up.id,
      'display_name', up.display_name
    ) as author,
    (
      SELECT jsonb_agg(jsonb_build_object('id', c.id))
      FROM confirmations c
      WHERE c.report_id = r.id
    ) as confirmations,
    -- Include crag/sector name information for display
    jsonb_build_object(
      'crag_name', crag.name,
      'crag_slug', crag.slug,
      'crag_is_sector', CASE WHEN crag.parent_crag_id IS NOT NULL THEN true ELSE false END,
      'sector_name', sector.name,
      'sector_slug', sector.slug
    ) as location_info,
    -- Window function runs before LIMIT/OFFSET, so this is the full match count
    COUNT(*) OVER () as total_count
  FROM reports r
  LEFT JOIN user_profiles up ON r.author_id = up.id
  LEFT JOIN crags crag ON crag.id = r.crag_id
  LEFT JOIN crags sector ON sector.id = r.sector_id
  WHERE
  (
    -- Include reports directly on the crag
    r.crag_id = p_crag_id
    OR
    -- Include reports on child sectors (check both crag_id and sector_id)
    r.crag_id IN (
      SELECT child.id FROM crags child WHERE child.parent_crag_id = p_crag_id
    )
    OR
    r.sector_id IN (
      SELECT child.id FROM crags child WHERE child.parent_crag_id = p_crag_id
    )
  )
  AND (p_category IS NULL OR r.category = p_category)
  ORDER BY
    -- Expired (stale) reports sink below everything still relevant
    (r.expires_at IS NOT NULL AND r.expires_at <= NOW()) ASC,
    DATE(r.observed_at) DESC,
    r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION fetch_reports_by_crag_sorted TO anon, authenticated;


-- Per-category report counts over the WHOLE set, so the crag page can render a
-- complete, accurate set of filter chips no matter how few pages are loaded.
DROP FUNCTION IF EXISTS fetch_report_category_counts_by_crag(text);

CREATE OR REPLACE FUNCTION fetch_report_category_counts_by_crag(
  p_crag_id TEXT
)
RETURNS TABLE (
  category TEXT,
  report_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT r.category, COUNT(*)
  FROM reports r
  WHERE
    r.crag_id = p_crag_id
    OR r.crag_id IN (
      SELECT child.id FROM crags child WHERE child.parent_crag_id = p_crag_id
    )
    OR r.sector_id IN (
      SELECT child.id FROM crags child WHERE child.parent_crag_id = p_crag_id
    )
  GROUP BY r.category;
END;
$$;

GRANT EXECUTE ON FUNCTION fetch_report_category_counts_by_crag TO anon, authenticated;
