-- Add weather_city column for secret crags to specify a reference city for weather forecasts
-- This allows showing weather data without revealing the exact crag location

ALTER TABLE crags
ADD COLUMN weather_city text;

-- Add comment explaining the column
COMMENT ON COLUMN crags.weather_city IS 'Reference city name for weather lookups on secret crags. Weather will be shown as "Weather for [city]" instead of exact coordinates.';
