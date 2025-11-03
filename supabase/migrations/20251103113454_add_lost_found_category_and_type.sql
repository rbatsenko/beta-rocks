-- Add lost_found category and lost_found_type field to reports table
-- This allows users to report lost or found gear and equipment at crags

-- Add lost_found_type column (nullable, values: 'lost' or 'found')
ALTER TABLE reports
ADD COLUMN lost_found_type TEXT;

-- Add CHECK constraint to ensure lost_found_type is only set when category is 'lost_found'
ALTER TABLE reports
ADD CONSTRAINT reports_lost_found_type_check
CHECK (
  (category = 'lost_found' AND lost_found_type IN ('lost', 'found')) OR
  (category != 'lost_found' AND lost_found_type IS NULL)
);

-- Drop the old category CHECK constraint
ALTER TABLE reports
DROP CONSTRAINT IF EXISTS reports_category_check;

-- Add new CHECK constraint with 'lost_found' category
ALTER TABLE reports
ADD CONSTRAINT reports_category_check
CHECK (category IN ('conditions', 'safety', 'access', 'climbing_info', 'facilities', 'lost_found', 'other'));

-- Update column comments
COMMENT ON COLUMN reports.category IS 'Report category: conditions (weather/friction), safety (hazards/bolts), access (closures/parking), climbing_info (rebolting/route changes), facilities (amenities), lost_found (lost or found gear), other';
COMMENT ON COLUMN reports.lost_found_type IS 'Type of lost/found report: lost (item being searched for) or found (item being held). Only valid when category is lost_found.';
