-- In-app notifications for crag report updates
-- Auto-creates notifications when reports are posted on favorited crags

CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'new_report' CHECK (type IN ('new_report', 'conditions_alert')),
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_profile_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_profile_id, read) WHERE read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_notifications" ON public.notifications FOR SELECT
  USING (user_profile_id IN (
    SELECT id FROM public.user_profiles
    WHERE sync_key_hash = current_setting('request.headers', true)::json->>'x-sync-key-hash'
  ));

CREATE POLICY "users_update_own_notifications" ON public.notifications FOR UPDATE
  USING (user_profile_id IN (
    SELECT id FROM public.user_profiles
    WHERE sync_key_hash = current_setting('request.headers', true)::json->>'x-sync-key-hash'
  ));

CREATE POLICY "users_delete_own_notifications" ON public.notifications FOR DELETE
  USING (user_profile_id IN (
    SELECT id FROM public.user_profiles
    WHERE sync_key_hash = current_setting('request.headers', true)::json->>'x-sync-key-hash'
  ));

-- Enable Realtime for live in-app updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger function: on report INSERT, create notifications for users who favorited that crag
CREATE OR REPLACE FUNCTION public.notify_on_new_report()
RETURNS TRIGGER AS $$
DECLARE
  fav RECORD;
  crag_record RECORD;
BEGIN
  SELECT name, slug INTO crag_record FROM public.crags WHERE id = NEW.crag_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  FOR fav IN
    SELECT DISTINCT uf.user_profile_id
    FROM public.user_favorites uf
    WHERE (uf.crag_id = NEW.crag_id OR uf.area_id = NEW.crag_id)
      AND uf.user_profile_id IS NOT NULL
      AND uf.user_profile_id != COALESCE(NEW.author_id::uuid, '00000000-0000-0000-0000-000000000000')
  LOOP
    INSERT INTO public.notifications (user_profile_id, type, title, body, data)
    VALUES (
      fav.user_profile_id,
      'new_report',
      'New report at ' || crag_record.name,
      COALESCE(LEFT(NEW.text, 100), 'New ' || NEW.category || ' report'),
      jsonb_build_object(
        'cragId', NEW.crag_id,
        'cragSlug', crag_record.slug,
        'cragName', crag_record.name,
        'reportId', NEW.id,
        'category', NEW.category
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_on_new_report
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_report();
