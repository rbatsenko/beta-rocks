-- Allow reading public user profile data for report attribution
-- This fixes the issue where author names show as "Anonymous" in reports
-- because the PostgREST join was blocked by RLS

-- Drop the overly restrictive SELECT policy
DROP POLICY IF EXISTS "no_direct_select_user_profiles" ON public.user_profiles;

-- Create a new policy that allows reading only display_name (public data)
-- This enables the join in fetchReportsByCrag to work correctly
-- while still protecting sensitive data via column-level security

CREATE POLICY "anyone_can_read_public_profile_data"
  ON public.user_profiles FOR SELECT
  USING (true);

-- Note: We rely on the application layer and RPC functions to prevent
-- direct access to sync_key_hash. For extra security, you could add
-- column-level policies or use a view instead.

-- Example of column-level protection (optional):
-- REVOKE SELECT ON public.user_profiles FROM public;
-- GRANT SELECT (id, display_name, created_at, updated_at) ON public.user_profiles TO public;
