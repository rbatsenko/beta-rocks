-- Add units_time_format parameter to update_user_profile_by_hash RPC
CREATE OR REPLACE FUNCTION public.update_user_profile_by_hash(
  p_sync_key_hash TEXT,
  p_display_name TEXT DEFAULT NULL,
  p_units_temperature TEXT DEFAULT NULL,
  p_units_wind_speed TEXT DEFAULT NULL,
  p_units_precipitation TEXT DEFAULT NULL,
  p_units_distance TEXT DEFAULT NULL,
  p_units_elevation TEXT DEFAULT NULL,
  p_units_time_format TEXT DEFAULT NULL
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
  units_time_format TEXT,
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
    units_time_format = COALESCE(p_units_time_format, user_profiles.units_time_format),
    updated_at = now()
  WHERE user_profiles.id = v_profile_id;

  -- Return updated profile
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
    user_profiles.units_time_format,
    user_profiles.created_at,
    user_profiles.updated_at
  FROM public.user_profiles
  WHERE user_profiles.id = v_profile_id;
END;
$$;

-- Update permissions for new function signature
GRANT EXECUTE ON FUNCTION public.update_user_profile_by_hash(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
