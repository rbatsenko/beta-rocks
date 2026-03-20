-- Allow updates to user_profiles (needed for locale sync from web/mobile)
-- Previous policy blocked all updates which prevented saving locale
DROP POLICY IF EXISTS "no_direct_update_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "allow_update_user_profiles" ON public.user_profiles;
CREATE POLICY "allow_update_user_profiles" ON public.user_profiles FOR UPDATE USING (true);
