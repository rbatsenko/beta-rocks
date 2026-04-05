-- Add confirmations_received to user_stats for badge computation
ALTER TABLE public.user_stats
ADD COLUMN IF NOT EXISTS confirmations_received INTEGER DEFAULT 0;

-- Trigger: when a confirmation is inserted, increment the report author's confirmations_received
CREATE OR REPLACE FUNCTION update_confirmations_received_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Find the report's author and increment their confirmations_received
  UPDATE user_stats
  SET
    confirmations_received = confirmations_received + 1,
    updated_at = NOW()
  WHERE user_profile_id = (
    SELECT author_id FROM reports WHERE id = NEW.report_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_confirmations_received
  AFTER INSERT ON confirmations
  FOR EACH ROW
  EXECUTE FUNCTION update_confirmations_received_count();

-- Trigger: when a confirmation is deleted, decrement the report author's confirmations_received
CREATE OR REPLACE FUNCTION decrement_confirmations_received_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_stats
  SET
    confirmations_received = GREATEST(confirmations_received - 1, 0),
    updated_at = NOW()
  WHERE user_profile_id = (
    SELECT author_id FROM reports WHERE id = OLD.report_id
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decrement_confirmations_received
  AFTER DELETE ON confirmations
  FOR EACH ROW
  EXECUTE FUNCTION decrement_confirmations_received_count();

-- Backfill existing confirmations_received
UPDATE user_stats us
SET
  confirmations_received = (
    SELECT COUNT(*)
    FROM confirmations c
    JOIN reports r ON c.report_id = r.id
    WHERE r.author_id = us.user_profile_id
  ),
  updated_at = NOW();

-- RPC function to get report counts by category for a user (for specialist badges)
CREATE OR REPLACE FUNCTION get_user_reports_by_category(p_user_profile_id UUID)
RETURNS TABLE(category TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
    SELECT r.category::TEXT, COUNT(*)::BIGINT
    FROM reports r
    WHERE r.author_id = p_user_profile_id
    GROUP BY r.category;
END;
$$ LANGUAGE plpgsql STABLE;

-- RPC function to get total confirmations received for a user (for badge display on report cards)
CREATE OR REPLACE FUNCTION get_user_confirmations_received(p_user_profile_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM confirmations c
    JOIN reports r ON c.report_id = r.id
    WHERE r.author_id = p_user_profile_id
  );
END;
$$ LANGUAGE plpgsql STABLE;
