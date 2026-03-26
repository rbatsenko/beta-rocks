-- Add time format preference to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS units_time_format TEXT DEFAULT '24h';
