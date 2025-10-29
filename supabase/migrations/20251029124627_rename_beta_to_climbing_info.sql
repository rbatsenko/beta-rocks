-- Rename 'beta' category to 'climbing_info'
-- This better reflects the purpose: sharing infrastructure updates like rebolting,
-- hardware condition, route changes, etc. rather than spraying beta sequences.

-- First, update any existing reports with 'beta' category to 'climbing_info'
UPDATE reports
SET category = 'climbing_info'
WHERE category = 'beta';

-- Drop the old CHECK constraint
ALTER TABLE reports
DROP CONSTRAINT IF EXISTS reports_category_check;

-- Add new CHECK constraint with 'climbing_info' instead of 'beta'
ALTER TABLE reports
ADD CONSTRAINT reports_category_check
CHECK (category IN ('conditions', 'safety', 'access', 'climbing_info', 'facilities', 'other'));

-- Update column comment
COMMENT ON COLUMN reports.category IS 'Report category: conditions (weather/friction), safety (hazards/bolts), access (closures/parking), climbing_info (rebolting/route changes), facilities (amenities), other';
