-- Allow crags without coordinates (locationless crags)
-- These are for crags with sensitive access where users don't want to share location
-- They can still have reports but won't show weather/conditions data

-- Make lat and lon nullable on crags table
ALTER TABLE public.crags ALTER COLUMN lat DROP NOT NULL;
ALTER TABLE public.crags ALTER COLUMN lon DROP NOT NULL;

-- Make latitude and longitude nullable on user_favorites table
ALTER TABLE public.user_favorites ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE public.user_favorites ALTER COLUMN longitude DROP NOT NULL;
