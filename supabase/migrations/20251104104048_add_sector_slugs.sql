-- Add slug_id and slug columns to sectors table
-- This allows sectors to have stable, SEO-friendly URLs

-- Add slug_id column (auto-incrementing unique integer)
CREATE SEQUENCE IF NOT EXISTS sectors_slug_id_seq;

ALTER TABLE sectors
ADD COLUMN IF NOT EXISTS slug_id BIGINT UNIQUE DEFAULT nextval('sectors_slug_id_seq');

COMMENT ON COLUMN sectors.slug_id IS 'Auto-incrementing integer ID used as suffix in slug';

-- Add slug column (unique, SEO-friendly URL identifier)
ALTER TABLE sectors
ADD COLUMN IF NOT EXISTS slug VARCHAR UNIQUE;

COMMENT ON COLUMN sectors.slug IS 'SEO-friendly URL slug (e.g., apremont-fontainebleau-42), stable and unique';

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_sectors_slug ON sectors(slug);

-- Generate slugs for all existing sectors
-- Format: {sector-name}-{parent-crag-name}-{slug-id}
UPDATE sectors s
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      UNACCENT(s.name || '-' || c.name || '-' || s.slug_id),
      '[^a-zA-Z0-9-]',
      '-',
      'g'
    ),
    '-+',
    '-',
    'g'
  )
)
FROM crags c
WHERE s.crag_id = c.id AND s.slug IS NULL;

-- Trim leading/trailing dashes
UPDATE sectors
SET slug = TRIM(BOTH '-' FROM slug)
WHERE slug IS NOT NULL;

-- Make slug NOT NULL after populating
ALTER TABLE sectors
ALTER COLUMN slug SET NOT NULL;
