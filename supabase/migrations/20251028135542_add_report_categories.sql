-- Add category field to reports table
-- This allows users to report different types of information beyond just weather

ALTER TABLE reports
ADD COLUMN category TEXT NOT NULL DEFAULT 'conditions'
CHECK (category IN ('conditions', 'safety', 'access', 'beta', 'facilities', 'other'));

-- Add index for filtering by category
CREATE INDEX idx_reports_category ON reports(category);

-- Add comment explaining categories
COMMENT ON COLUMN reports.category IS 'Report category: conditions (weather/friction), safety (hazards/bolts), access (closures/parking), beta (route info), facilities (amenities), other';
