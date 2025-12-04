-- Drop the old broken search_locations_unaccent function
-- This function referenced a non-existent 'sectors' table
-- Replaced by search_locations_enhanced which correctly handles the unified crags table

DROP FUNCTION IF EXISTS search_locations_unaccent(TEXT);
