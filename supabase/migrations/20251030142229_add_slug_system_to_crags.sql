-- Migration: Add slug_id and slug system to crags table
-- This enables SEO-friendly, stable URLs like /location/smith-rock-42

-- Step 1: Add new columns
ALTER TABLE public.crags
ADD COLUMN slug_id BIGSERIAL,
ADD COLUMN slug VARCHAR(255);

-- Step 2: Create slugify function (URL-safe string generation)
CREATE OR REPLACE FUNCTION public.slugify(text_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  slug TEXT;
BEGIN
  -- Convert to lowercase
  slug := LOWER(text_input);

  -- Normalize accented characters (decompose NFD)
  -- Note: requires unaccent extension
  BEGIN
    slug := UNACCENT(slug);
  EXCEPTION WHEN undefined_function THEN
    -- If unaccent not available, skip this step
    NULL;
  END;

  -- Remove non-alphanumeric characters (keep spaces and hyphens)
  slug := REGEXP_REPLACE(slug, '[^a-z0-9\s-]', '', 'g');

  -- Trim whitespace
  slug := TRIM(slug);

  -- Replace spaces with hyphens
  slug := REGEXP_REPLACE(slug, '\s+', '-', 'g');

  -- Collapse multiple hyphens
  slug := REGEXP_REPLACE(slug, '-+', '-', 'g');

  -- Trim leading/trailing hyphens
  slug := TRIM(BOTH '-' FROM slug);

  RETURN slug;
END;
$$;

-- Step 3: Create function to generate unique slug with numeric suffix
CREATE OR REPLACE FUNCTION public.generate_unique_slug(base_name TEXT, crag_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  candidate_slug TEXT;
  suffix INTEGER := 1;
  max_iterations INTEGER := 1000;
  current_slug_id BIGINT;
BEGIN
  -- Generate base slug from name
  base_slug := public.slugify(base_name);

  -- Handle empty slugs
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'crag';
  END IF;

  -- Get the slug_id for this crag (for new inserts, it will be assigned)
  SELECT slug_id INTO current_slug_id
  FROM public.crags
  WHERE id = crag_id;

  -- If slug_id is available, use it as suffix
  IF current_slug_id IS NOT NULL THEN
    RETURN base_slug || '-' || current_slug_id::TEXT;
  END IF;

  -- Otherwise, find next available suffix (for manual backfill)
  candidate_slug := base_slug || '-' || suffix::TEXT;

  WHILE EXISTS (
    SELECT 1 FROM public.crags
    WHERE slug = candidate_slug
    AND id != crag_id
  ) AND suffix < max_iterations LOOP
    suffix := suffix + 1;
    candidate_slug := base_slug || '-' || suffix::TEXT;
  END LOOP;

  IF suffix >= max_iterations THEN
    RAISE EXCEPTION 'Could not generate unique slug for % after % iterations', base_name, max_iterations;
  END IF;

  RETURN candidate_slug;
END;
$$;

-- Step 4: Create trigger function to auto-generate slug on INSERT
CREATE OR REPLACE FUNCTION public.auto_generate_crag_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only generate slug if not provided
  IF NEW.slug IS NULL THEN
    -- Wait for slug_id to be assigned by SERIAL, then generate slug
    -- Note: slug_id is auto-assigned on INSERT
    NEW.slug := public.generate_unique_slug(NEW.name, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Step 5: Create trigger (fires BEFORE INSERT)
CREATE TRIGGER trigger_auto_generate_crag_slug
BEFORE INSERT ON public.crags
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_crag_slug();

-- Step 6: Backfill slugs for existing crags
-- This uses the slug_id that was auto-assigned
DO $$
DECLARE
  crag_record RECORD;
  new_slug TEXT;
BEGIN
  FOR crag_record IN
    SELECT id, name, slug_id
    FROM public.crags
    WHERE slug IS NULL
    ORDER BY created_at, id
  LOOP
    new_slug := public.generate_unique_slug(crag_record.name, crag_record.id);

    UPDATE public.crags
    SET slug = new_slug
    WHERE id = crag_record.id;

    RAISE NOTICE 'Generated slug for %: %', crag_record.name, new_slug;
  END LOOP;
END;
$$;

-- Step 7: Add constraints and indexes
ALTER TABLE public.crags
ALTER COLUMN slug SET NOT NULL,
ADD CONSTRAINT crags_slug_unique UNIQUE (slug),
ADD CONSTRAINT crags_slug_id_unique UNIQUE (slug_id);

-- Create index for fast slug lookups
CREATE INDEX idx_crags_slug ON public.crags(slug);

-- Create index for slug_id (for any direct ID lookups)
CREATE INDEX idx_crags_slug_id ON public.crags(slug_id);

-- Step 8: Add comment for documentation
COMMENT ON COLUMN public.crags.slug_id IS 'Auto-incrementing integer ID used as suffix in slug';
COMMENT ON COLUMN public.crags.slug IS 'SEO-friendly URL slug (e.g., smith-rock-42), stable and unique';
