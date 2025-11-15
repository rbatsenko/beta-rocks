-- Update fetch_reports_by_crag_sorted to include reports from child sectors
DROP FUNCTION IF EXISTS fetch_reports_by_crag_sorted(text, int);

CREATE OR REPLACE FUNCTION fetch_reports_by_crag_sorted(
  p_crag_id TEXT,
  p_limit INT DEFAULT 20
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
  confirmations JSONB
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
    ) as confirmations
  FROM reports r
  LEFT JOIN user_profiles up ON r.author_id = up.id
  WHERE
    -- Include reports directly on the crag
    r.crag_id = p_crag_id
    OR
    -- Include reports on child sectors (sectors where parent_crag_id = p_crag_id)
    r.sector_id IN (
      SELECT id FROM crags WHERE parent_crag_id = p_crag_id
    )
  ORDER BY
    DATE(r.observed_at) DESC,
    r.created_at DESC
  LIMIT p_limit;
END;
$$;
