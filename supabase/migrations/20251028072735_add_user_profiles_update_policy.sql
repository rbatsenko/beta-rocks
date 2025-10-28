-- Add UPDATE policy for user_profiles
-- Allows anyone to update user profiles (since we're using client-side operations with RLS)

CREATE POLICY "anyone_can_update_user_profiles"
  ON public.user_profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);
