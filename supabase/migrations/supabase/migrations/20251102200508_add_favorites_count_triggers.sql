-- Add triggers to automatically update favorites_count in user_stats
-- when favorites are added or removed

-- Function to update favorites_count when a favorite is added
CREATE OR REPLACE FUNCTION public.increment_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or increment favorites_count in user_stats
  INSERT INTO public.user_stats (user_profile_id, favorites_count, last_active)
  VALUES (NEW.user_profile_id, 1, now())
  ON CONFLICT (user_profile_id)
  DO UPDATE SET
    favorites_count = user_stats.favorites_count + 1,
    last_active = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update favorites_count when a favorite is removed
CREATE OR REPLACE FUNCTION public.decrement_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrement favorites_count in user_stats
  UPDATE public.user_stats
  SET
    favorites_count = GREATEST(favorites_count - 1, 0),
    last_active = now()
  WHERE user_profile_id = OLD.user_profile_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment count when favorite is added
CREATE TRIGGER increment_favorites_count_trigger
  AFTER INSERT ON public.user_favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_favorites_count();

-- Trigger to decrement count when favorite is removed
CREATE TRIGGER decrement_favorites_count_trigger
  AFTER DELETE ON public.user_favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_favorites_count();

-- Recalculate favorites_count for all existing users
-- This will fix any discrepancies from before the triggers were added
UPDATE public.user_stats
SET favorites_count = (
  SELECT COUNT(*)
  FROM public.user_favorites
  WHERE user_favorites.user_profile_id = user_stats.user_profile_id
);
