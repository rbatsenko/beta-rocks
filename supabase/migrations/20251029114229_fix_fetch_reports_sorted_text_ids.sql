-- Fix fetch_reports_by_crag_sorted to use TEXT for id fields instead of UUID
-- The original migration incorrectly used UUID types

DROP FUNCTION IF EXISTS fetch_reports_by_crag_sorted(text, integer);

CREATE OR REPLACE FUNCTION fetch_reports_by_crag_sorted(
  p_crag_id text,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id text,  -- Changed from uuid to text
  crag_id text,
  sector_id text,
  route_id text,
  author_id text,  -- Changed from uuid to text
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
    DATE(r.observed_at) DESC,
    r.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION fetch_reports_by_crag_sorted TO anon, authenticated;
