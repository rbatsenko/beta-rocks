-- Migration: Fix slug generation trigger to handle empty strings
-- This allows the trigger to auto-generate slugs when empty string is provided

CREATE OR REPLACE FUNCTION public.auto_generate_crag_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generate slug if not provided or empty
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    -- Generate slug using name and ID
    NEW.slug := public.generate_unique_slug(NEW.name, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;
