-- Add parent_crag_id column to crags table for sector/crag hierarchy
ALTER TABLE crags
ADD COLUMN parent_crag_id text REFERENCES crags(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_crags_parent_crag_id ON crags(parent_crag_id);

-- Add comment to describe the column
COMMENT ON COLUMN crags.parent_crag_id IS 'Reference to parent crag if this is a sector. NULL if this is a top-level crag.';
