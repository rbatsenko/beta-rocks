-- Fix ambiguous column reference in update_user_profile_by_hash function
-- The issue: RETURNS TABLE creates implicit variables with the same names as table columns
-- causing "column reference 'id' is ambiguous" error

-- Drop and recreate the function with explicit column qualification
CREATE OR REPLACE FUNCTION public.update_user_profile_by_hash(
  p_sync_key_hash TEXT,
  p_display_name TEXT DEFAULT NULL,
  p_units_temperature TEXT DEFAULT NULL,
  p_units_wind_speed TEXT DEFAULT NULL,
  p_units_precipitation TEXT DEFAULT NULL,
  p_units_distance TEXT DEFAULT NULL,
  p_units_elevation TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  sync_key_hash TEXT,
  display_name TEXT,
  units_temperature TEXT,
  units_wind_speed TEXT,
  units_precipitation TEXT,
  units_distance TEXT,
  units_elevation TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Find the profile ID matching the hash
  SELECT user_profiles.id INTO v_profile_id
  FROM public.user_profiles
  WHERE user_profiles.sync_key_hash = p_sync_key_hash
  LIMIT 1;

  -- If no matching profile, raise error
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for provided sync key hash';
  END IF;

  -- Update profile with provided non-NULL values
  UPDATE public.user_profiles
  SET
    display_name = COALESCE(p_display_name, user_profiles.display_name),
    units_temperature = COALESCE(p_units_temperature, user_profiles.units_temperature),
    units_wind_speed = COALESCE(p_units_wind_speed, user_profiles.units_wind_speed),
    units_precipitation = COALESCE(p_units_precipitation, user_profiles.units_precipitation),
    units_distance = COALESCE(p_units_distance, user_profiles.units_distance),
    units_elevation = COALESCE(p_units_elevation, user_profiles.units_elevation),
    updated_at = now()
  WHERE user_profiles.id = v_profile_id;

  -- Return updated profile
  -- Use table name prefix to avoid ambiguity with RETURNS TABLE columns
  RETURN QUERY
  SELECT
    user_profiles.id,
    user_profiles.sync_key_hash,
    user_profiles.display_name,
    user_profiles.units_temperature,
    user_profiles.units_wind_speed,
    user_profiles.units_precipitation,
    user_profiles.units_distance,
    user_profiles.units_elevation,
    user_profiles.created_at,
    user_profiles.updated_at
  FROM public.user_profiles
  WHERE user_profiles.id = v_profile_id;
END;
$$;

-- Ensure permissions are still granted
GRANT EXECUTE ON FUNCTION public.update_user_profile_by_hash(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
