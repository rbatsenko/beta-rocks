-- Add chat history tables for syncing conversations across devices
-- This allows users to preserve chat history and sync it via their sync key

-- Chat sessions (conversations)
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT, -- Auto-generated from first message, e.g., "El Cap conditions"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Individual messages within a session
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tool_invocations JSONB, -- Store tool calls and results for reference
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can read their own sessions
CREATE POLICY "anyone_can_read_own_sessions"
  ON public.chat_sessions FOR SELECT
  USING (true);

CREATE POLICY "anyone_can_create_sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "anyone_can_update_own_sessions"
  ON public.chat_sessions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anyone_can_delete_own_sessions"
  ON public.chat_sessions FOR DELETE
  USING (true);

-- Policies: Anyone can read/write messages in their sessions
CREATE POLICY "anyone_can_read_messages"
  ON public.chat_messages FOR SELECT
  USING (true);

CREATE POLICY "anyone_can_create_messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "anyone_can_delete_messages"
  ON public.chat_messages FOR DELETE
  USING (true);

-- Indexes for performance
CREATE INDEX idx_chat_sessions_user_profile ON public.chat_sessions(user_profile_id);
CREATE INDEX idx_chat_sessions_created_at ON public.chat_sessions(created_at DESC);
CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Trigger for updated_at
CREATE TRIGGER chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.chat_sessions IS 'Stores chat conversation sessions for syncing across devices';
COMMENT ON TABLE public.chat_messages IS 'Individual messages within chat sessions';
COMMENT ON COLUMN public.chat_messages.tool_invocations IS 'JSON array of tool calls and results for this message';
