-- Secure User Profiles RLS Policies
-- Prevents unauthorized access to user profile data and sync key hashes
-- Implements secure RPC functions for profile access instead of direct SELECT

-- ============================================================
-- STEP 1: Drop permissive policies
-- ============================================================

-- Drop the insecure SELECT policy that allows anyone to read all profiles
DROP POLICY IF EXISTS "anyone_can_read_user_profiles" ON public.user_profiles;

-- Drop the insecure UPDATE policy that allows anyone to update any profile
DROP POLICY IF EXISTS "anyone_can_update_user_profiles" ON public.user_profiles;

-- ============================================================
-- STEP 2: Create restrictive policies
-- ============================================================

-- Block all direct SELECT queries (force use of RPC functions)
CREATE POLICY "no_direct_select_user_profiles"
  ON public.user_profiles FOR SELECT
  USING (false);

-- Block all direct UPDATE queries (force use of RPC functions)
CREATE POLICY "no_direct_update_user_profiles"
  ON public.user_profiles FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- Keep INSERT policy (needed for user registration)
-- The "anyone_can_create_user_profile" policy remains unchanged

-- ============================================================
-- STEP 3: Create secure RPC functions
-- ============================================================

-- Function: Get user profile by sync key hash
-- Only returns a profile if the hash matches
-- Security: No way to enumerate all profiles
CREATE OR REPLACE FUNCTION public.get_user_profile_by_hash(p_sync_key_hash TEXT)
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
BEGIN
  -- Return profile matching the provided hash (max 1 result)
  RETURN QUERY
  SELECT
    up.id,
    up.sync_key_hash,
    up.display_name,
    up.units_temperature,
    up.units_wind_speed,
    up.units_precipitation,
    up.units_distance,
    up.units_elevation,
    up.created_at,
    up.updated_at
  FROM public.user_profiles up
  WHERE up.sync_key_hash = p_sync_key_hash
  LIMIT 1;
END;
$$;

-- Function: Update user profile by sync key hash
-- Only updates if the hash matches (verifies ownership)
-- Returns the updated profile
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
  SELECT up.id INTO v_profile_id
  FROM public.user_profiles up
  WHERE up.sync_key_hash = p_sync_key_hash
  LIMIT 1;

  -- If no matching profile, raise error
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for provided sync key hash';
  END IF;

  -- Update profile with provided non-NULL values
  UPDATE public.user_profiles
  SET
    display_name = COALESCE(p_display_name, display_name),
    units_temperature = COALESCE(p_units_temperature, units_temperature),
    units_wind_speed = COALESCE(p_units_wind_speed, units_wind_speed),
    units_precipitation = COALESCE(p_units_precipitation, units_precipitation),
    units_distance = COALESCE(p_units_distance, units_distance),
    units_elevation = COALESCE(p_units_elevation, units_elevation),
    updated_at = now()
  WHERE id = v_profile_id;

  -- Return updated profile
  RETURN QUERY
  SELECT
    up.id,
    up.sync_key_hash,
    up.display_name,
    up.units_temperature,
    up.units_wind_speed,
    up.units_precipitation,
    up.units_distance,
    up.units_elevation,
    up.created_at,
    up.updated_at
  FROM public.user_profiles up
  WHERE up.id = v_profile_id;
END;
$$;

-- Grant execute permissions to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_profile_by_hash(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_profile_by_hash(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Test that direct SELECT is blocked (should return no rows for any user)
-- SELECT * FROM user_profiles; -- This will return empty due to RLS

-- Test that RPC functions work (replace with actual hash)
-- SELECT * FROM get_user_profile_by_hash('your_test_hash_here');
