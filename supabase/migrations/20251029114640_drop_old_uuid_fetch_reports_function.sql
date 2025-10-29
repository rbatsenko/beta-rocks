-- Drop the incorrectly typed fetch_reports_by_crag_sorted function
-- It was using UUID types instead of TEXT types for id fields

DROP FUNCTION IF EXISTS fetch_reports_by_crag_sorted(text, integer);
