-- Convert reports category from single value to multi-select array
-- This allows users to tag reports with multiple categories (e.g., both "conditions" and "safety")

-- Step 1: Add new categories column as TEXT[]
ALTER TABLE reports
ADD COLUMN categories TEXT[] DEFAULT ARRAY['conditions']::TEXT[];

-- Step 2: Migrate existing data from category to categories
UPDATE reports
SET categories = ARRAY[category]::TEXT[]
WHERE category IS NOT NULL;

-- Step 3: Drop the old category column and its index
DROP INDEX IF EXISTS idx_reports_category;
ALTER TABLE reports
DROP COLUMN category;

-- Step 4: Add constraint to ensure at least one category is selected
ALTER TABLE reports
ADD CONSTRAINT reports_categories_not_empty CHECK (array_length(categories, 1) > 0);

-- Step 5: Add constraint to ensure all categories are valid
ALTER TABLE reports
ADD CONSTRAINT reports_categories_valid CHECK (
  categories <@ ARRAY['conditions', 'safety', 'access', 'climbing_info', 'facilities', 'other']::TEXT[]
);

-- Step 6: Add GIN index for efficient array queries
CREATE INDEX idx_reports_categories_gin ON reports USING GIN (categories);

-- Add comment explaining categories
COMMENT ON COLUMN reports.categories IS 'Report categories (multi-select): conditions (weather/friction), safety (hazards/bolts), access (closures/parking), climbing_info (route info), facilities (amenities), other';
