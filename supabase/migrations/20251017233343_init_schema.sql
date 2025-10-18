-- Initial schema for temps-rocks
-- Climbing conditions app with community reports and multi-device sync

-- User profiles for sync key-based identity
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_key_hash TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Climbing crags (locations)
CREATE TABLE public.crags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lon DECIMAL(11, 8) NOT NULL,
  country TEXT NOT NULL,
  rock_type TEXT,
  aspects INTEGER[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sectors within crags
CREATE TABLE public.sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crag_id UUID NOT NULL REFERENCES public.crags(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lat DECIMAL(10, 8),
  lon DECIMAL(11, 8),
  aspect INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Routes within sectors
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Community condition reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crag_id UUID REFERENCES public.crags(id) ON DELETE CASCADE,
  sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  author_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  text TEXT,
  rating_dry INTEGER CHECK (rating_dry >= 1 AND rating_dry <= 5),
  rating_wind INTEGER CHECK (rating_wind >= 1 AND rating_wind <= 5),
  rating_crowds INTEGER CHECK (rating_crowds >= 1 AND rating_crowds <= 5),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Report confirmations (thumbs up)
CREATE TABLE public.confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_key_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(report_id, user_key_hash)
);

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confirmations ENABLE ROW LEVEL SECURITY;

-- User profiles: public read, anyone can insert (for sync key generation)
CREATE POLICY "anyone_can_read_user_profiles"
  ON public.user_profiles FOR SELECT
  USING (true);

CREATE POLICY "anyone_can_create_user_profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (true);

-- Crags: public read, anyone can insert
CREATE POLICY "anyone_can_read_crags"
  ON public.crags FOR SELECT
  USING (true);

CREATE POLICY "anyone_can_create_crag"
  ON public.crags FOR INSERT
  WITH CHECK (true);

-- Sectors: public read, anyone can insert
CREATE POLICY "anyone_can_read_sectors"
  ON public.sectors FOR SELECT
  USING (true);

CREATE POLICY "anyone_can_create_sector"
  ON public.sectors FOR INSERT
  WITH CHECK (true);

-- Routes: public read, anyone can insert
CREATE POLICY "anyone_can_read_routes"
  ON public.routes FOR SELECT
  USING (true);

CREATE POLICY "anyone_can_create_route"
  ON public.routes FOR INSERT
  WITH CHECK (true);

-- Reports: public read, anyone can create
CREATE POLICY "anyone_can_read_reports"
  ON public.reports FOR SELECT
  USING (true);

CREATE POLICY "anyone_can_create_report"
  ON public.reports FOR INSERT
  WITH CHECK (true);

-- Confirmations: public read, anyone can create
CREATE POLICY "anyone_can_read_confirmations"
  ON public.confirmations FOR SELECT
  USING (true);

CREATE POLICY "anyone_can_create_confirmation"
  ON public.confirmations FOR INSERT
  WITH CHECK (true);

-- Performance indexes
CREATE INDEX idx_sectors_crag_id ON public.sectors(crag_id);
CREATE INDEX idx_routes_sector_id ON public.routes(sector_id);
CREATE INDEX idx_reports_crag_id ON public.reports(crag_id);
CREATE INDEX idx_reports_sector_id ON public.reports(sector_id);
CREATE INDEX idx_reports_route_id ON public.reports(route_id);
CREATE INDEX idx_reports_author_id ON public.reports(author_id);
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX idx_confirmations_report_id ON public.confirmations(report_id);
CREATE INDEX idx_confirmations_user_key_hash ON public.confirmations(user_key_hash);
CREATE INDEX idx_user_profiles_sync_key_hash ON public.user_profiles(sync_key_hash);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at on all tables
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER crags_updated_at
  BEFORE UPDATE ON public.crags
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER sectors_updated_at
  BEFORE UPDATE ON public.sectors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER routes_updated_at
  BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
