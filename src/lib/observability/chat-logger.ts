import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with service role for logging
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;

interface ChatLogData {
  sessionId: string;
  messageId?: string;
  userMessage: string;
  toolCalls?: Array<{
    name: string;
    arguments: unknown;
  }>;
  toolResults?: Array<{
    name: string;
    result: unknown;
  }>;
  aiResponse?: string;
  locationName?: string;
  countryCode?: string;
  rockType?: string;
  frictionScore?: number;
  error?: string;
  metadata?: Record<string, unknown>;
  durationMs?: number;
  userAgent?: string;
  locale?: string;
  // Token usage
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
  estimatedCostUsd?: number;
}

/**
 * Calculate estimated cost in USD for Gemini 2.5 Flash
 * Pricing as of Jan 2025 (Paid Tier):
 * - Input: $0.30 per 1M tokens
 * - Output: $2.50 per 1M tokens
 * - Context caching: $0.03 per 1M tokens
 * @see https://ai.google.dev/pricing
 */
export function calculateGeminiCost(usage: {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
}): number {
  const INPUT_PRICE_PER_MILLION = 0.3; // $0.30 per 1M tokens
  const OUTPUT_PRICE_PER_MILLION = 2.5; // $2.50 per 1M tokens
  const CACHE_PRICE_PER_MILLION = 0.03; // $0.03 per 1M tokens

  const inputCost = ((usage.inputTokens || 0) / 1_000_000) * INPUT_PRICE_PER_MILLION;
  const outputCost = ((usage.outputTokens || 0) / 1_000_000) * OUTPUT_PRICE_PER_MILLION;
  const cachedCost = ((usage.cachedInputTokens || 0) / 1_000_000) * CACHE_PRICE_PER_MILLION;

  return inputCost + outputCost + cachedCost;
}

/**
 * Log a chat interaction for observability
 * Non-blocking - errors are logged but don't interrupt the flow
 */
export async function logChatInteraction(data: ChatLogData): Promise<void> {
  // Skip logging if Supabase is not configured
  if (!supabase) {
    console.warn("[ChatLogger] Supabase not configured, skipping log");
    return;
  }

  try {
    const { error } = await supabase.from("chat_logs").insert({
      session_id: data.sessionId,
      message_id: data.messageId,
      user_message: data.userMessage,
      tool_calls: data.toolCalls ? JSON.stringify(data.toolCalls) : null,
      tool_results: data.toolResults ? JSON.stringify(data.toolResults) : null,
      ai_response: data.aiResponse,
      location_name: data.locationName,
      country_code: data.countryCode,
      rock_type: data.rockType,
      friction_score: data.frictionScore,
      error: data.error,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      duration_ms: data.durationMs,
      user_agent: data.userAgent,
      locale: data.locale,
      // Token usage
      input_tokens: data.inputTokens,
      output_tokens: data.outputTokens,
      total_tokens: data.totalTokens,
      reasoning_tokens: data.reasoningTokens,
      cached_input_tokens: data.cachedInputTokens,
      estimated_cost_usd: data.estimatedCostUsd,
    });

    if (error) {
      console.error("[ChatLogger] Failed to log chat interaction:", error);
    }
  } catch (err) {
    // Don't throw - logging should never break the app
    console.error("[ChatLogger] Unexpected error while logging:", err);
  }
}

/**
 * Extract metadata from tool results for structured logging
 */
export function extractMetadataFromToolResults(
  toolResults: Array<{ toolName: string; result: unknown }> | undefined
): {
  locationName?: string;
  countryCode?: string;
  rockType?: string;
  frictionScore?: number;
} {
  if (!toolResults || toolResults.length === 0) {
    return {};
  }

  const metadata: ReturnType<typeof extractMetadataFromToolResults> = {};

  for (const { toolName, result } of toolResults) {
    if (toolName === "get_conditions" && result && typeof result === "object") {
      const data = result as {
        location?: string;
        country?: string;
        rockType?: string;
        frictionScore?: number;
      };

      if (data.location) metadata.locationName = data.location;
      if (data.country) metadata.countryCode = data.country;
      if (data.rockType) metadata.rockType = data.rockType;
      if (typeof data.frictionScore === "number") metadata.frictionScore = data.frictionScore;
    }
  }

  return metadata;
}
