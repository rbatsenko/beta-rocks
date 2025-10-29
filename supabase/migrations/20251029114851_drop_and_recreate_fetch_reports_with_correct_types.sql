-- Recreate fetch_reports_by_crag_sorted with correct TEXT types for all ID fields
-- This replaces the previous version that incorrectly used UUID types

DROP FUNCTION IF EXISTS fetch_reports_by_crag_sorted(text, integer);

CREATE OR REPLACE FUNCTION fetch_reports_by_crag_sorted(
  p_crag_id text,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id text,
  crag_id text,
  sector_id text,
  route_id text,
  author_id text,
  category text,
  text text,
  rating_dry integer,
  rating_wind integer,
  rating_crowds integer,
  created_at timestamptz,
  updated_at timestamptz,
  observed_at timestamptz,
  author jsonb,
  confirmations jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.crag_id,
    r.sector_id,
    r.route_id,
    r.author_id,
    r.category,
    r.text,
    r.rating_dry,
    r.rating_wind,
    r.rating_crowds,
    r.created_at,
    r.updated_at,
    r.observed_at,
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
  WHERE r.crag_id = p_crag_id
  ORDER BY
    DATE(r.observed_at) DESC,  -- Group by observation date (most recent first)
    r.created_at DESC          -- Within same day, newest submissions first
  LIMIT p_limit;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION fetch_reports_by_crag_sorted TO anon, authenticated;

COMMENT ON FUNCTION fetch_reports_by_crag_sorted IS
'Fetches reports for a crag with proper date-grouped sorting. Groups reports by observation date (ignoring time), then sorts by creation timestamp within each day. All ID fields use TEXT type to match schema.';
