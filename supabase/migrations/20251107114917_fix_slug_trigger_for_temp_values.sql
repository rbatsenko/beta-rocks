-- Fix slug generation trigger to handle placeholder values like 'temp'
-- This ensures slugs are always generated properly even if temporary values are passed

DROP TRIGGER IF EXISTS trigger_auto_generate_crag_slug ON public.crags;

CREATE OR REPLACE FUNCTION public.auto_generate_crag_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generate slug if not provided, empty, or is a placeholder value
  -- Placeholder values: 'temp', 'temporary', 'placeholder'
  IF NEW.slug IS NULL
     OR NEW.slug = ''
     OR LOWER(NEW.slug) IN ('temp', 'temporary', 'placeholder') THEN

    -- Generate slug using slug_id as suffix
    -- NEW.slug_id is available since this runs AFTER INSERT
    UPDATE public.crags
    SET slug = public.generate_unique_slug(NEW.name, NEW.id)
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate AFTER INSERT trigger
CREATE TRIGGER trigger_auto_generate_crag_slug
AFTER INSERT ON public.crags
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_crag_slug();

-- Fix any existing crags with 'temp' slugs
UPDATE public.crags
SET slug = public.generate_unique_slug(name, id)
WHERE LOWER(slug) IN ('temp', 'temporary', 'placeholder');
