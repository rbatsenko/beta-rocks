-- Make country column nullable since OSM data doesn't include country
ALTER TABLE crags ALTER COLUMN country DROP NOT NULL;
