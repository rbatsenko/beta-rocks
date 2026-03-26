-- Add report_helpful notification type and trigger
-- Sends a notification to the report author when someone marks their report as helpful

-- Extend the type check constraint to include report_helpful
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('new_report', 'conditions_alert', 'report_helpful'));

-- Trigger function: on confirmation INSERT, notify the report author
CREATE OR REPLACE FUNCTION public.notify_on_report_helpful()
RETURNS TRIGGER AS $$
DECLARE
  report_record RECORD;
  crag_record RECORD;
BEGIN
  -- Get the report and its author
  SELECT id, crag_id, author_id, category, text
  INTO report_record
  FROM public.reports
  WHERE id = NEW.report_id;

  IF NOT FOUND OR report_record.author_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Don't notify if the user is marking their own report
  IF report_record.author_id::text = NEW.user_key_hash THEN
    RETURN NEW;
  END IF;

  -- Look up the author's user_profile by matching sync_key_hash
  -- author_id in reports stores the user_profile.id directly
  -- Verify the profile exists
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = report_record.author_id) THEN
    RETURN NEW;
  END IF;

  -- Get crag info for the notification
  SELECT name, slug INTO crag_record FROM public.crags WHERE id = report_record.crag_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Create the notification
  INSERT INTO public.notifications (user_profile_id, type, title, body, data)
  VALUES (
    report_record.author_id,
    'report_helpful',
    'Someone found your report helpful',
    COALESCE(LEFT(report_record.text, 80), report_record.category || ' report') || ' at ' || crag_record.name,
    jsonb_build_object(
      'cragId', report_record.crag_id,
      'cragSlug', crag_record.slug,
      'cragName', crag_record.name,
      'reportId', report_record.id,
      'category', report_record.category
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_on_report_helpful
  AFTER INSERT ON public.confirmations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_report_helpful();
