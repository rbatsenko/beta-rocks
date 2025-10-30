/**
 * Chat History Service
 *
 * Manages chat conversation persistence with dual-layer storage:
 * 1. localStorage - immediate persistence, offline access
 * 2. Supabase - cross-device sync via sync key
 *
 * Features:
 * - Automatic background sync to cloud
 * - Offline-first architecture
 * - Session management (current conversation)
 * - History preservation across refreshes
 */

import { getUserProfile, hashSyncKeyAsync } from "@/lib/auth/sync-key";
import { fetchOrCreateUserProfile } from "@/lib/db/queries";
import { supabase } from "@/integrations/supabase/client";
import type { UIMessage } from "ai";
import { emitSyncStatus } from "@/hooks/useSyncStatus";
import { setSessionCookie } from "@/lib/auth/cookie-actions";

const STORAGE_KEYS = {
  CURRENT_SESSION_ID: "temps_current_session_id",
  MESSAGES: "temps_chat_messages",
  LAST_SYNC: "temps_last_sync",
  USER_PROFILE: "temps_user_profile",
} as const;

export interface ChatSession {
  id: string;
  user_profile_id: string;
  title: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_invocations?: any;
  created_at: string;
}

/**
 * Get or create current chat session
 */
export async function getCurrentSession(): Promise<ChatSession> {
  // Check localStorage for current session
  const currentSessionId = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION_ID);

  if (currentSessionId) {
    // Try to load from Supabase (use maybeSingle to handle missing sessions gracefully)
    const { data: session, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", currentSessionId)
      .maybeSingle();

    // Ignore "not found" errors, create new session instead
    if (error && error.code !== "PGRST116") {
      console.error("Error fetching session:", error);
    }

    if (session) {
      // Ensure cookie is set for existing session
      await setSessionCookie(session.id);
      return session;
    }
  }

  // If no local session, check if user has existing sessions in DB
  // This handles profile restoration on new devices
  const localProfile = getUserProfile();
  if (localProfile) {
    try {
      const syncKeyHash = await hashSyncKeyAsync(localProfile.syncKey);
      const { data: dbProfile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("sync_key_hash", syncKeyHash)
        .maybeSingle();

      if (dbProfile) {
        // Fetch user's most recent session
        const { data: recentSession } = await supabase
          .from("chat_sessions")
          .select("*")
          .eq("user_profile_id", dbProfile.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentSession) {
          console.log("[getCurrentSession] Restored existing session:", recentSession.id);
          // Store session ID locally and in cookie
          localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_ID, recentSession.id);
          await setSessionCookie(recentSession.id);
          return recentSession;
        }
      }
    } catch (err) {
      console.error("[getCurrentSession] Failed to fetch existing session:", err);
    }
  }

  // Create new session (either no localStorage ID, or session not found in DB)
  return await createNewSession();
}

/**
 * Create a new chat session
 * Requires existing user profile
 */
export async function createNewSession(): Promise<ChatSession> {
  // Get existing user profile (must exist to create session)
  const localProfile = getUserProfile();
  if (!localProfile) {
    throw new Error("Must have user profile to create chat session");
  }

  const syncKeyHash = await hashSyncKeyAsync(localProfile.syncKey);

  // Get or create user in database
  const dbProfile = await fetchOrCreateUserProfile(syncKeyHash);

  // Create session in Supabase
  const { data: session, error } = await supabase
    .from("chat_sessions")
    .insert({
      user_profile_id: dbProfile.id,
    })
    .select()
    .single();

  if (error || !session) {
    throw new Error("Failed to create chat session");
  }

  // Store session ID locally and in cookie
  localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_ID, session.id);
  await setSessionCookie(session.id);

  return session;
}

/**
 * Save a message to localStorage and sync to Supabase
 */
export async function saveChatMessage(
  id: string,
  role: "user" | "assistant" | "system",
  content: string,
  toolInvocations?: any
): Promise<void> {
  try {
    // Get current session
    const session = await getCurrentSession();

    // Check if message already exists in localStorage
    const existingMessages = loadMessagesFromLocalStorage();
    if (existingMessages.some((m) => m.id === id)) {
      // Message already saved, skip
      return;
    }

    const message: ChatMessage = {
      id,
      session_id: session.id,
      role,
      content,
      tool_invocations: toolInvocations,
      created_at: new Date().toISOString(),
    };

    // Save to localStorage immediately
    const messages = loadMessagesFromLocalStorage();
    messages.push(message);
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));

    // Sync to Supabase in background
    syncToSupabase(message).catch((err) => {
      console.error("Failed to sync message to Supabase:", err);
    });

    // Update session title if this is the first user message
    if (role === "user" && messages.filter((m) => m.role === "user").length === 1) {
      updateSessionTitle(session.id, content).catch((err) => {
        console.error("Failed to update session title:", err);
      });
    }
  } catch (error) {
    console.error("Failed to save chat message:", error);
  }
}

/**
 * Sync a message to Supabase (push local → DB)
 */
async function syncToSupabase(message: ChatMessage): Promise<void> {
  emitSyncStatus("syncing");

  const { error } = await supabase.from("chat_messages").insert({
    id: message.id,
    session_id: message.session_id,
    role: message.role,
    content: message.content,
    tool_invocations: message.tool_invocations,
    created_at: message.created_at,
  });

  if (error) {
    emitSyncStatus("offline");
    throw error;
  }

  localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  emitSyncStatus("synced");
}

/**
 * Sync from Supabase to localStorage (pull DB → local)
 * Checks for new messages in the database and updates localStorage
 */
export async function syncFromSupabase(): Promise<void> {
  try {
    emitSyncStatus("syncing");

    // Get current session
    const currentSessionId = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION_ID);
    if (!currentSessionId) {
      emitSyncStatus("synced");
      return;
    }

    // Fetch all messages for current session from DB
    const { data: dbMessages, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", currentSessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[syncFromSupabase] Failed to fetch messages:", error);
      emitSyncStatus("offline");
      return;
    }

    if (!dbMessages || dbMessages.length === 0) {
      emitSyncStatus("synced");
      return;
    }

    // Get local messages
    const localMessages = loadMessagesFromLocalStorage();

    // Check if DB has different/newer messages
    const localIds = new Set(localMessages.map((m) => m.id));
    const dbIds = new Set(dbMessages.map((m: any) => m.id));

    // Find messages in DB but not in local
    const newMessages = dbMessages.filter((m: any) => !localIds.has(m.id));

    // Find messages in local but not in DB (shouldn't happen, but handle it)
    const localOnlyMessages = localMessages.filter((m) => !dbIds.has(m.id));

    if (newMessages.length > 0) {
      console.log(
        `[syncFromSupabase] Found ${newMessages.length} new messages in DB, syncing to localStorage`
      );
      // Replace localStorage with DB version (source of truth)
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(dbMessages));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } else if (localOnlyMessages.length > 0) {
      console.log(
        `[syncFromSupabase] Found ${localOnlyMessages.length} local-only messages, pushing to DB`
      );
      // Push local-only messages to DB
      for (const msg of localOnlyMessages) {
        await syncToSupabase(msg).catch((err) =>
          console.error("[syncFromSupabase] Failed to push local message:", err)
        );
      }
    }

    emitSyncStatus("synced");
  } catch (err) {
    console.error("[syncFromSupabase] Sync failed:", err);
    emitSyncStatus("offline");
  }
}

/**
 * Update session title based on first message
 */
async function updateSessionTitle(sessionId: string, firstMessage: string): Promise<void> {
  // Generate a short title from first message (max 50 chars)
  const title = firstMessage.length > 50 ? firstMessage.substring(0, 47) + "..." : firstMessage;

  await supabase.from("chat_sessions").update({ title }).eq("id", sessionId);
}

/**
 * Load messages from localStorage
 */
function loadMessagesFromLocalStorage(): ChatMessage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Load chat history (localStorage first, fallback to Supabase)
 */
export async function loadChatHistory(): Promise<UIMessage[]> {
  try {
    // Get current session first to know which messages to load
    const session = await getCurrentSession();
    console.log("[loadChatHistory] Current session:", session.id);

    // Try localStorage first (faster, offline-capable)
    const localMessages = loadMessagesFromLocalStorage();
    console.log("[loadChatHistory] LocalStorage messages count:", localMessages.length);
    console.log("[loadChatHistory] First message session_id:", localMessages[0]?.session_id);
    console.log(
      "[loadChatHistory] Session IDs match:",
      localMessages[0]?.session_id === session.id
    );

    // Check if localStorage has messages for the CURRENT session
    if (localMessages.length > 0 && localMessages[0]?.session_id === session.id) {
      console.log("[loadChatHistory] ✅ Returning messages from localStorage");
      // Sort by created_at to ensure correct chronological order
      const sortedMessages = [...localMessages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      return sortedMessages.map((msg) => {
        // Build parts array: text content + tool invocations
        const parts: any[] = [];

        // Add text content if present
        if (msg.content) {
          parts.push({ type: "text", text: msg.content });
        }

        // Add tool invocations if present
        if (msg.tool_invocations && Array.isArray(msg.tool_invocations)) {
          // Ensure each tool part has required toolCallId
          const toolParts = msg.tool_invocations.map((part: any) => {
            // If toolCallId is missing, generate one
            if (!part.toolCallId) {
              return {
                ...part,
                toolCallId: `${msg.id}-tool-${part.type}`,
              };
            }
            return part;
          });
          parts.push(...toolParts);
        }

        console.log(`[loadChatHistory] Message ${msg.id} parts:`, parts.length, parts);

        return {
          id: msg.id,
          role: msg.role,
          parts,
        };
      });
    }

    console.log("[loadChatHistory] ❌ Session mismatch, fetching from Supabase...");

    // Fetch from Supabase (either no localStorage or wrong session)
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });

    if (messages && messages.length > 0) {
      // Save to localStorage for next time
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));

      return messages.map((msg: any) => {
        // Build parts array: text content + tool invocations
        const parts: any[] = [];

        // Add text content if present
        if (msg.content) {
          parts.push({ type: "text", text: msg.content });
        }

        // Add tool invocations if present
        if (msg.tool_invocations && Array.isArray(msg.tool_invocations)) {
          // Ensure each tool part has required toolCallId
          const toolParts = msg.tool_invocations.map((part: any) => {
            // If toolCallId is missing, generate one
            if (!part.toolCallId) {
              return {
                ...part,
                toolCallId: `${msg.id}-tool-${part.type}`,
              };
            }
            return part;
          });
          parts.push(...toolParts);
        }

        return {
          id: msg.id,
          role: msg.role as "user" | "assistant" | "system",
          parts,
        };
      });
    }
  } catch (error) {
    console.error("Failed to load chat history:", error);
  }

  return [];
}

/**
 * Start a new chat (clear messages in current session)
 */
export async function startNewChat(): Promise<void> {
  try {
    // Get current session
    const currentSessionId = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION_ID);

    if (currentSessionId) {
      // Delete all messages in the current session from Supabase
      await supabase.from("chat_messages").delete().eq("session_id", currentSessionId);
    }
  } catch (error) {
    console.error("Failed to delete messages from Supabase:", error);
  }

  // Clear localStorage messages (keep session ID)
  localStorage.removeItem(STORAGE_KEYS.MESSAGES);
}

/**
 * Clear all chat history (localStorage + Supabase)
 */
export async function clearAllChatHistory(): Promise<void> {
  try {
    // Get user profile
    const localProfile = getUserProfile();
    if (!localProfile) return;

    const syncKeyHash = await hashSyncKeyAsync(localProfile.syncKey);

    // Get user from database
    const { data: dbProfile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("sync_key_hash", syncKeyHash)
      .single();

    if (dbProfile) {
      // Delete all sessions (messages cascade delete)
      await supabase.from("chat_sessions").delete().eq("user_profile_id", dbProfile.id);
    }
  } catch (error) {
    console.error("Failed to clear chat history from Supabase:", error);
  }

  // Clear localStorage
  localStorage.removeItem(STORAGE_KEYS.MESSAGES);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION_ID);
  localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
}

/**
 * Delete user profile and all associated data
 * Removes: user_profile, chat_sessions, chat_messages, user_favorites
 * Keeps: reports (community contributions)
 */
export async function deleteUserProfile(): Promise<void> {
  try {
    // Get user profile
    const localProfile = getUserProfile();
    if (!localProfile) return;

    const syncKeyHash = await hashSyncKeyAsync(localProfile.syncKey);

    // Get user from database
    const { data: dbProfile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("sync_key_hash", syncKeyHash)
      .single();

    if (dbProfile) {
      // Delete all favorites
      await supabase.from("user_favorites").delete().eq("user_profile_id", dbProfile.id);

      // Delete all sessions (messages cascade delete)
      await supabase.from("chat_sessions").delete().eq("user_profile_id", dbProfile.id);

      // Delete user profile
      await supabase.from("user_profiles").delete().eq("id", dbProfile.id);

      console.log("User profile and associated data deleted successfully");
    }
  } catch (error) {
    console.error("Failed to delete user profile from Supabase:", error);
    throw error;
  }

  // Clear all localStorage
  localStorage.removeItem(STORAGE_KEYS.MESSAGES);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION_ID);
  localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
  localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  localStorage.removeItem("temps_sync_banner_dismissed");
  localStorage.removeItem("temps_sync_notification_dismissed");
}
