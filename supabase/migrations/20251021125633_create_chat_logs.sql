-- Create chat_logs table for observability
CREATE TABLE IF NOT EXISTS public.chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Session tracking
  session_id TEXT NOT NULL,
  message_id TEXT,

  -- User input
  user_message TEXT NOT NULL,

  -- Tool execution
  tool_calls JSONB,
  tool_results JSONB,

  -- AI response
  ai_response TEXT,

  -- Metadata
  location_name TEXT,
  country_code TEXT,
  rock_type TEXT,
  friction_score NUMERIC,

  -- Error tracking
  error TEXT,

  -- Additional metadata
  metadata JSONB,

  -- Performance metrics
  duration_ms INTEGER,

  -- User info (optional, for analytics)
  user_agent TEXT,
  locale TEXT,

  -- Indexing
  CONSTRAINT chat_logs_pkey PRIMARY KEY (id)
);

-- Create indexes for common queries
CREATE INDEX idx_chat_logs_created_at ON public.chat_logs(created_at DESC);
CREATE INDEX idx_chat_logs_session_id ON public.chat_logs(session_id);
CREATE INDEX idx_chat_logs_location_name ON public.chat_logs(location_name) WHERE location_name IS NOT NULL;
CREATE INDEX idx_chat_logs_country_code ON public.chat_logs(country_code) WHERE country_code IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to insert logs
CREATE POLICY "Service role can insert chat logs"
  ON public.chat_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Allow service role to read logs (for analytics)
CREATE POLICY "Service role can read chat logs"
  ON public.chat_logs
  FOR SELECT
  TO service_role
  USING (true);

-- Add comment for documentation
COMMENT ON TABLE public.chat_logs IS 'Stores chat interactions for observability and analytics';
COMMENT ON COLUMN public.chat_logs.session_id IS 'Unique identifier for a chat session';
COMMENT ON COLUMN public.chat_logs.tool_calls IS 'JSON array of tool calls made by the AI';
COMMENT ON COLUMN public.chat_logs.tool_results IS 'JSON array of tool results returned';
COMMENT ON COLUMN public.chat_logs.metadata IS 'Additional metadata like disambiguation choices, user preferences, etc.';
