-- Enable the unaccent extension for accent-insensitive text search
-- This allows searching for "Apremont Desert" to match "Apremont Désert"

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create an immutable wrapper function for unaccent (required for indexes)
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
  RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $func$
  SELECT unaccent('unaccent', $1)
$func$;
