-- Migration: Fix slug generation to use AFTER INSERT trigger
-- This ensures slug_id is assigned before generating the slug

-- Step 1: Drop the existing BEFORE INSERT trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_crag_slug ON public.crags;

-- Step 2: Replace trigger function to work with AFTER INSERT
CREATE OR REPLACE FUNCTION public.auto_generate_crag_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generate slug if not provided or empty
  -- Now NEW.slug_id is available since this runs AFTER INSERT
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    -- Generate slug using slug_id as suffix
    UPDATE public.crags
    SET slug = public.generate_unique_slug(NEW.name, NEW.id)
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 3: Create new AFTER INSERT trigger
CREATE TRIGGER trigger_auto_generate_crag_slug
AFTER INSERT ON public.crags
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_crag_slug();

-- Step 4: Regenerate slugs for ai_chat source crags with incorrect suffixes
-- These are the ones that got suffix -1, -2, etc instead of using slug_id
DO $$
DECLARE
  crag_record RECORD;
  new_slug TEXT;
BEGIN
  FOR crag_record IN
    SELECT id, name, slug_id, slug
    FROM public.crags
    WHERE source = 'ai_chat'
    ORDER BY created_at DESC
  LOOP
    -- Regenerate slug using slug_id
    new_slug := public.slugify(crag_record.name) || '-' || crag_record.slug_id::TEXT;

    -- Only update if different from current slug
    IF new_slug != crag_record.slug THEN
      UPDATE public.crags
      SET slug = new_slug
      WHERE id = crag_record.id;

      RAISE NOTICE 'Updated slug for %: % -> %', crag_record.name, crag_record.slug, new_slug;
    END IF;
  END LOOP;
END;
$$;
