-- Create user_profiles table for sync key based identity
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_key_hash TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create crags table
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

-- Create sectors table
CREATE TABLE public.sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crag_id UUID REFERENCES public.crags(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lat DECIMAL(10, 8),
  lon DECIMAL(11, 8),
  aspect INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create routes table
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID REFERENCES public.sectors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create reports table for community condition reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crag_id UUID REFERENCES public.crags(id) ON DELETE CASCADE,
  sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  author_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  text TEXT,
  rating_dry INTEGER CHECK (rating_dry BETWEEN 1 AND 5),
  rating_wind INTEGER CHECK (rating_wind BETWEEN 1 AND 5),
  rating_crowds INTEGER CHECK (rating_crowds BETWEEN 1 AND 5),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create confirmations table to prevent duplicate confirmations
CREATE TABLE public.confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
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

-- User profiles: users can read all, but only update their own
CREATE POLICY "Anyone can view user profiles"
  ON public.user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (id = id);

-- Crags: public read, authenticated insert
CREATE POLICY "Anyone can view crags"
  ON public.crags FOR SELECT
  USING (true);

CREATE POLICY "Anyone can add crags"
  ON public.crags FOR INSERT
  WITH CHECK (true);

-- Sectors: public read, authenticated insert
CREATE POLICY "Anyone can view sectors"
  ON public.sectors FOR SELECT
  USING (true);

CREATE POLICY "Anyone can add sectors"
  ON public.sectors FOR INSERT
  WITH CHECK (true);

-- Routes: public read, authenticated insert
CREATE POLICY "Anyone can view routes"
  ON public.routes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can add routes"
  ON public.routes FOR INSERT
  WITH CHECK (true);

-- Reports: public read, author can update/delete
CREATE POLICY "Anyone can view reports"
  ON public.reports FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authors can update their own reports"
  ON public.reports FOR UPDATE
  USING (author_id IN (SELECT id FROM public.user_profiles));

CREATE POLICY "Authors can delete their own reports"
  ON public.reports FOR DELETE
  USING (author_id IN (SELECT id FROM public.user_profiles));

-- Confirmations: public read, one per user per report
CREATE POLICY "Anyone can view confirmations"
  ON public.confirmations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can add confirmations"
  ON public.confirmations FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_sectors_crag_id ON public.sectors(crag_id);
CREATE INDEX idx_routes_sector_id ON public.routes(sector_id);
CREATE INDEX idx_reports_crag_id ON public.reports(crag_id);
CREATE INDEX idx_reports_sector_id ON public.reports(sector_id);
CREATE INDEX idx_reports_route_id ON public.reports(route_id);
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX idx_confirmations_report_id ON public.confirmations(report_id);
CREATE INDEX idx_user_profiles_sync_key_hash ON public.user_profiles(sync_key_hash);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
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