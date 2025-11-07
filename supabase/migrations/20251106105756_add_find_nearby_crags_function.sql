-- Create function to find nearby crags using PostGIS earth_distance
-- This provides accurate distance calculations for duplicate detection

CREATE OR REPLACE FUNCTION find_nearby_crags(
  search_lat DECIMAL,
  search_lon DECIMAL,
  radius_meters INTEGER DEFAULT 500
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  lat DECIMAL,
  lon DECIMAL,
  slug VARCHAR,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.lat,
    c.lon,
    c.slug,
    earth_distance(
      ll_to_earth(search_lat, search_lon),
      ll_to_earth(c.lat, c.lon)
    ) as distance_meters
  FROM crags c
  WHERE earth_box(ll_to_earth(search_lat, search_lon), radius_meters) @> ll_to_earth(c.lat, c.lon)
  ORDER BY distance_meters
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment
COMMENT ON FUNCTION find_nearby_crags IS 'Find crags within a specified radius using PostGIS earth_distance for accurate calculations';
