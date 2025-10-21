-- Add token usage and cost tracking to chat_logs
ALTER TABLE public.chat_logs
ADD COLUMN IF NOT EXISTS input_tokens INTEGER,
ADD COLUMN IF NOT EXISTS output_tokens INTEGER,
ADD COLUMN IF NOT EXISTS total_tokens INTEGER,
ADD COLUMN IF NOT EXISTS reasoning_tokens INTEGER,
ADD COLUMN IF NOT EXISTS cached_input_tokens INTEGER,
ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC(10, 6);

-- Add index for cost analysis queries
CREATE INDEX IF NOT EXISTS idx_chat_logs_total_tokens ON public.chat_logs(total_tokens) WHERE total_tokens IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_logs_estimated_cost ON public.chat_logs(estimated_cost_usd) WHERE estimated_cost_usd IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.chat_logs.input_tokens IS 'Number of input/prompt tokens';
COMMENT ON COLUMN public.chat_logs.output_tokens IS 'Number of output/completion tokens';
COMMENT ON COLUMN public.chat_logs.total_tokens IS 'Total tokens (input + output)';
COMMENT ON COLUMN public.chat_logs.reasoning_tokens IS 'Reasoning tokens for models like o1';
COMMENT ON COLUMN public.chat_logs.cached_input_tokens IS 'Cached prompt tokens (reduces cost)';
COMMENT ON COLUMN public.chat_logs.estimated_cost_usd IS 'Estimated cost in USD based on token usage';
