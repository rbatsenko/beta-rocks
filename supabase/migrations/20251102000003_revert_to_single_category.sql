-- Revert reports back to single category column from categories array
-- This simplifies the schema and makes category selection single-choice

-- Step 1: Add back the single category column
ALTER TABLE reports
ADD COLUMN category TEXT DEFAULT 'conditions';

-- Step 2: Migrate data from categories array to single category (take first element)
UPDATE reports
SET category = categories[1]
WHERE categories IS NOT NULL AND array_length(categories, 1) > 0;

-- Step 3: Drop the categories array column and its constraints/indexes
DROP INDEX IF EXISTS idx_reports_categories_gin;
ALTER TABLE reports
DROP CONSTRAINT IF EXISTS reports_categories_not_empty;
ALTER TABLE reports
DROP CONSTRAINT IF EXISTS reports_categories_valid;
ALTER TABLE reports
DROP COLUMN categories;

-- Step 4: Add NOT NULL constraint and check constraint for valid categories
ALTER TABLE reports
ALTER COLUMN category SET NOT NULL;

ALTER TABLE reports
ADD CONSTRAINT reports_category_valid CHECK (category IN ('conditions', 'safety', 'access', 'climbing_info', 'facilities', 'other'));

-- Step 5: Add index for efficient category filtering
CREATE INDEX idx_reports_category ON reports(category);

-- Add comment explaining categories
COMMENT ON COLUMN reports.category IS 'Report category: conditions (weather/friction), safety (hazards/bolts), access (closures/parking), climbing_info (route info), facilities (amenities), other';
