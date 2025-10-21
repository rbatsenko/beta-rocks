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
