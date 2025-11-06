-- Add UPDATE policy for crags table to allow converting crags to sectors
-- This allows users to update parent_crag_id and other fields

CREATE POLICY "anyone_can_update_crags"
ON crags
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
