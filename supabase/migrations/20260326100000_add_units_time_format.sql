-- Add time format preference to user_profiles
-- NULL means "use app default" (derived from unit system in-app)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS units_time_format TEXT DEFAULT NULL
CHECK (units_time_format IS NULL OR units_time_format IN ('12h', '24h'));
