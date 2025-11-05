-- Enable realtime on reports table for live activity feed
-- This allows clients to subscribe to INSERT events on the reports table

ALTER PUBLICATION supabase_realtime ADD TABLE reports;

-- Add comment for documentation
COMMENT ON PUBLICATION supabase_realtime IS 'Realtime publication including reports table for live activity feed';
