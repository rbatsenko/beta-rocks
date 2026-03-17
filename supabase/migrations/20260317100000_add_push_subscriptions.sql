CREATE TABLE public.push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  token text NOT NULL,
  device_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Prevent duplicate tokens per user
CREATE UNIQUE INDEX idx_push_sub_unique ON public.push_subscriptions (user_profile_id, token);
CREATE INDEX idx_push_sub_user ON public.push_subscriptions(user_profile_id);
CREATE INDEX idx_push_sub_active ON public.push_subscriptions(is_active) WHERE is_active = true;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS for Edge Function access
-- Users can manage their own subscriptions via API
CREATE POLICY "users_manage_own_push_subs" ON public.push_subscriptions FOR ALL
  USING (user_profile_id IN (
    SELECT id FROM public.user_profiles
    WHERE sync_key_hash = current_setting('request.headers', true)::json->>'x-sync-key-hash'
  ));
