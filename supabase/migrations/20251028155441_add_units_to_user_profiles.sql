-- Add units preferences to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN units_temperature text CHECK (units_temperature IN ('celsius', 'fahrenheit')),
ADD COLUMN units_wind_speed text CHECK (units_wind_speed IN ('kmh', 'mph', 'ms', 'knots')),
ADD COLUMN units_precipitation text CHECK (units_precipitation IN ('mm', 'inches')),
ADD COLUMN units_distance text CHECK (units_distance IN ('km', 'miles')),
ADD COLUMN units_elevation text CHECK (units_elevation IN ('meters', 'feet'));

-- Add comment to explain the units columns
COMMENT ON COLUMN user_profiles.units_temperature IS 'User preference for temperature units';
COMMENT ON COLUMN user_profiles.units_wind_speed IS 'User preference for wind speed units';
COMMENT ON COLUMN user_profiles.units_precipitation IS 'User preference for precipitation units';
COMMENT ON COLUMN user_profiles.units_distance IS 'User preference for distance units';
COMMENT ON COLUMN user_profiles.units_elevation IS 'User preference for elevation units';
