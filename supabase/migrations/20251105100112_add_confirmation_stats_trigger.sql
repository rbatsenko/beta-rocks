-- Function to update confirmations_given count when a confirmation is created
CREATE OR REPLACE FUNCTION update_confirmations_given_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Find the user profile with matching sync_key_hash and update their stats
  UPDATE user_stats
  SET
    confirmations_given = confirmations_given + 1,
    last_active = NOW(),
    updated_at = NOW()
  WHERE user_profile_id = (
    SELECT id FROM user_profiles WHERE sync_key_hash = NEW.user_key_hash
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update stats when confirmation is created
CREATE TRIGGER trigger_update_confirmations_given
  AFTER INSERT ON confirmations
  FOR EACH ROW
  EXECUTE FUNCTION update_confirmations_given_count();

-- Backfill existing confirmations to fix the stats
UPDATE user_stats us
SET
  confirmations_given = (
    SELECT COUNT(*)
    FROM confirmations c
    JOIN user_profiles up ON c.user_key_hash = up.sync_key_hash
    WHERE up.id = us.user_profile_id
  ),
  updated_at = NOW()
WHERE user_profile_id IN (
  SELECT up.id
  FROM user_profiles up
  WHERE EXISTS (
    SELECT 1 FROM confirmations c WHERE c.user_key_hash = up.sync_key_hash
  )
);
