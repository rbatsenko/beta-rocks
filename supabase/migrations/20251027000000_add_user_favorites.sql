-- Add user_favorites table for favorite crags
-- This allows users to save their favorite climbing locations and sync across devices

CREATE TABLE public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  crag_id TEXT REFERENCES public.crags(id) ON DELETE CASCADE,
  area_id TEXT, -- OpenBeta area ID (for crags not yet in our database)
  area_name TEXT NOT NULL,
  area_slug TEXT,
  location TEXT, -- "Country, Region" for display
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  rock_type TEXT,

  -- Cached conditions for quick display (optional)
  last_rating TEXT,
  last_friction_score DECIMAL(3, 2),
  last_checked_at TIMESTAMPTZ,

  -- Ordering and timestamps
  display_order INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure user can't favorite the same crag twice
  UNIQUE(user_profile_id, crag_id),
  UNIQUE(user_profile_id, area_id)
);

-- Enable RLS on user_favorites
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Anyone can read all favorites (for public sharing in the future)
CREATE POLICY "anyone_can_read_favorites"
  ON public.user_favorites FOR SELECT
  USING (true);

-- Anyone can insert favorites (anonymous users)
CREATE POLICY "anyone_can_create_favorite"
  ON public.user_favorites FOR INSERT
  WITH CHECK (true);

-- Anyone can update their own favorites (matched by user_profile_id)
CREATE POLICY "anyone_can_update_own_favorites"
  ON public.user_favorites FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Anyone can delete their own favorites
CREATE POLICY "anyone_can_delete_own_favorites"
  ON public.user_favorites FOR DELETE
  USING (true);

-- Performance indexes
CREATE INDEX idx_user_favorites_user_profile_id ON public.user_favorites(user_profile_id);
CREATE INDEX idx_user_favorites_crag_id ON public.user_favorites(crag_id);
CREATE INDEX idx_user_favorites_area_id ON public.user_favorites(area_id);
CREATE INDEX idx_user_favorites_display_order ON public.user_favorites(user_profile_id, display_order);
CREATE INDEX idx_user_favorites_added_at ON public.user_favorites(added_at DESC);

-- Trigger for updated_at
CREATE TRIGGER user_favorites_updated_at
  BEFORE UPDATE ON public.user_favorites
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add user stats for tracking user activity
CREATE TABLE public.user_stats (
  user_profile_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  reports_posted INTEGER DEFAULT 0,
  confirmations_given INTEGER DEFAULT 0,
  favorites_count INTEGER DEFAULT 0,
  last_active TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on user_stats
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "anyone_can_read_user_stats"
  ON public.user_stats FOR SELECT
  USING (true);

-- Anyone can insert/update stats (anonymous users)
CREATE POLICY "anyone_can_upsert_user_stats"
  ON public.user_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "anyone_can_update_user_stats"
  ON public.user_stats FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at on user_stats
CREATE TRIGGER user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index on user_stats
CREATE INDEX idx_user_stats_last_active ON public.user_stats(last_active DESC);
