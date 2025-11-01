/**
 * React Query hooks for chat messages and sessions
 *
 * Replaces the localStorage-based system with React Query for:
 * - Automatic caching and synchronization
 * - Optimistic updates
 * - Automatic refetching on window focus
 * - Proper error handling and rollback
 *
 * Features:
 * - useCurrentSession() - Gets or creates current chat session
 * - useChatMessages(sessionId) - Fetches messages for a session
 * - useSendMessage() - Mutation to send a message with optimistic updates
 * - useCreateSession() - Mutation to create new session
 * - useClearSession() - Mutation to clear current session messages
 * - useClearAllHistory() - Mutation to delete all user sessions
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserProfile, hashSyncKeyAsync } from "@/lib/auth/sync-key";
import { fetchOrCreateUserProfile } from "@/lib/db/queries";
import { setSessionCookie } from "@/lib/auth/cookie-actions";
import { emitSyncStatus } from "@/hooks/useSyncStatus";
import type { UIMessage } from "ai";

// Query keys for React Query cache management
export const chatKeys = {
  all: ["chat"] as const,
  sessions: () => [...chatKeys.all, "sessions"] as const,
  session: (id: string | undefined) => [...chatKeys.sessions(), id] as const,
  currentSession: () => [...chatKeys.sessions(), "current"] as const,
  messages: (sessionId: string | undefined) => [...chatKeys.all, "messages", sessionId] as const,
} as const;

// Types based on Supabase schema
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
  created_at: string | null;
}

/**
 * Get or create current chat session
 * Only runs if user has a profile (no auto-creation)
 */
export function useCurrentSession() {
  // Check if user profile exists (don't create one)
  const hasProfile = typeof window !== "undefined" ? !!getUserProfile() : false;

  return useQuery({
    queryKey: chatKeys.currentSession(),
    queryFn: async (): Promise<ChatSession> => {
      try {
        // Get existing user profile (don't initialize)
        const localProfile = getUserProfile();
        if (!localProfile) {
          throw new Error("No user profile found");
        }

        const syncKeyHash = await hashSyncKeyAsync(localProfile.syncKey);
        const dbProfile = await fetchOrCreateUserProfile(syncKeyHash);

        // Fetch user's most recent session
        const { data: recentSession, error } = await supabase
          .from("chat_sessions")
          .select("*")
          .eq("user_profile_id", dbProfile.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error("[useCurrentSession] Error fetching session:", error);
          throw error;
        }

        if (recentSession) {
          // Set session cookie for SSR
          await setSessionCookie(recentSession.id);
          return recentSession;
        }

        // No session found, create new one
        const { data: newSession, error: createError } = await supabase
          .from("chat_sessions")
          .insert({
            user_profile_id: dbProfile.id,
          })
          .select()
          .single();

        if (createError || !newSession) {
          throw new Error("Failed to create chat session");
        }

        // Set session cookie for SSR
        await setSessionCookie(newSession.id);

        return newSession;
      } catch (error) {
        console.error("[useCurrentSession] Failed to get or create session:", error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - session doesn't change often
    gcTime: 1000 * 60 * 30, // 30 minutes garbage collection time (renamed from cacheTime)
    refetchOnWindowFocus: false, // Session doesn't need refetch on focus
    retry: 2,
    enabled: hasProfile, // Only fetch if user has a profile
  });
}

/**
 * Fetch messages for a specific session
 * Returns empty array if no messages exist
 */
export function useChatMessages(
  sessionId: string | undefined
): UseQueryResult<ChatMessage[], Error> {
  return useQuery({
    queryKey: chatKeys.messages(sessionId),
    queryFn: async (): Promise<ChatMessage[]> => {
      if (!sessionId) {
        return [];
      }

      try {
        emitSyncStatus("syncing");

        const { data: messages, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("[useChatMessages] Error fetching messages:", error);
          emitSyncStatus("offline");
          throw error;
        }

        emitSyncStatus("synced");
        // Type assertion needed because Supabase returns Json type for tool_invocations
        return (messages || []) as ChatMessage[];
      } catch (error) {
        emitSyncStatus("offline");
        throw error;
      }
    },
    enabled: !!sessionId, // Only run query if sessionId exists
    staleTime: 1000 * 60, // 1 minute - messages can be refetched frequently
    gcTime: 1000 * 60 * 10, // 10 minutes garbage collection
    refetchOnWindowFocus: true, // Refetch messages when window gains focus
    retry: 2,
  });
}

/**
 * Send a new chat message with optimistic updates
 * Automatically adds message to cache before server response
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      message,
    }: {
      sessionId: string;
      message: Omit<ChatMessage, "session_id" | "created_at">;
    }) => {
      try {
        emitSyncStatus("syncing");

        const { data, error } = await supabase
          .from("chat_messages")
          .insert({
            id: message.id,
            session_id: sessionId,
            role: message.role,
            content: message.content,
            tool_invocations: message.tool_invocations || null,
          })
          .select()
          .single();

        if (error) {
          console.error("[useSendMessage] Error sending message:", error);
          emitSyncStatus("offline");
          throw error;
        }

        emitSyncStatus("synced");

        // Update session title if this is the first user message
        if (message.role === "user") {
          const messages = queryClient.getQueryData<ChatMessage[]>(chatKeys.messages(sessionId));
          const userMessages = messages?.filter((m) => m.role === "user") || [];

          if (userMessages.length === 0) {
            // This is the first user message, update session title
            const title =
              message.content.length > 50
                ? message.content.substring(0, 47) + "..."
                : message.content;

            await supabase.from("chat_sessions").update({ title }).eq("id", sessionId);

            // Invalidate session queries to refetch with new title
            queryClient.invalidateQueries({ queryKey: chatKeys.currentSession() });
          }
        }

        return data;
      } catch (error) {
        emitSyncStatus("offline");
        throw error;
      }
    },
    onMutate: async ({ sessionId, message }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: chatKeys.messages(sessionId) });

      // Snapshot previous value for rollback
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(
        chatKeys.messages(sessionId)
      );

      // Optimistically update cache with new message
      queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(sessionId), (old = []) => [
        ...old,
        {
          ...message,
          session_id: sessionId,
          created_at: new Date().toISOString(),
        },
      ]);

      // Return context with snapshot for rollback
      return { previousMessages };
    },
    onError: (error, { sessionId }, context) => {
      console.error("[useSendMessage] Mutation failed, rolling back:", error);

      // Rollback to previous state on error
      if (context?.previousMessages) {
        queryClient.setQueryData(chatKeys.messages(sessionId), context.previousMessages);
      }
    },
    onSuccess: (_, { sessionId }) => {
      // Invalidate and refetch messages to ensure consistency
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(sessionId) });
    },
  });
}

/**
 * Create a new chat session
 * Invalidates current session query to force refetch
 */
export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<ChatSession> => {
      try {
        // Get existing user profile (user must have profile to create session)
        const localProfile = getUserProfile();
        if (!localProfile) {
          throw new Error("Must have user profile to create chat session");
        }

        const syncKeyHash = await hashSyncKeyAsync(localProfile.syncKey);
        const dbProfile = await fetchOrCreateUserProfile(syncKeyHash);

        // Create new session
        const { data: newSession, error } = await supabase
          .from("chat_sessions")
          .insert({
            user_profile_id: dbProfile.id,
          })
          .select()
          .single();

        if (error || !newSession) {
          throw new Error("Failed to create chat session");
        }

        // Set session cookie for SSR
        await setSessionCookie(newSession.id);

        return newSession;
      } catch (error) {
        console.error("[useCreateSession] Failed to create session:", error);
        throw error;
      }
    },
    onSuccess: (newSession) => {
      // Update current session in cache
      queryClient.setQueryData(chatKeys.currentSession(), newSession);

      // Invalidate messages for new session (should be empty)
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(newSession.id) });
    },
  });
}

/**
 * Clear current session messages
 * Deletes all messages in the current session from database
 */
export function useClearSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string): Promise<void> => {
      try {
        // Delete all messages in the session
        const { error } = await supabase.from("chat_messages").delete().eq("session_id", sessionId);

        if (error) {
          console.error("[useClearSession] Error deleting messages:", error);
          throw error;
        }
      } catch (error) {
        console.error("[useClearSession] Failed to clear session:", error);
        throw error;
      }
    },
    onSuccess: (_, sessionId) => {
      // Clear messages cache for this session
      queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(sessionId), []);

      // Invalidate to force refetch and confirm deletion
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(sessionId) });
    },
  });
}

/**
 * Clear all chat history
 * Deletes all sessions and messages for the current user
 */
export function useClearAllHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      try {
        // Get user profile
        const localProfile = getUserProfile();
        if (!localProfile) {
          throw new Error("No user profile found");
        }

        const syncKeyHash = await hashSyncKeyAsync(localProfile.syncKey);

        // Get user from database
        const { data: dbProfile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("sync_key_hash", syncKeyHash)
          .single();

        if (dbProfile) {
          // Delete all sessions (messages cascade delete automatically)
          const { error } = await supabase
            .from("chat_sessions")
            .delete()
            .eq("user_profile_id", dbProfile.id);

          if (error) {
            console.error("[useClearAllHistory] Error deleting sessions:", error);
            throw error;
          }
        }
      } catch (error) {
        console.error("[useClearAllHistory] Failed to clear history:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Clear all chat-related queries from cache
      queryClient.removeQueries({ queryKey: chatKeys.all });

      // Force refetch of current session (will create new one)
      queryClient.invalidateQueries({ queryKey: chatKeys.currentSession() });
    },
  });
}

/**
 * Convert ChatMessage to UIMessage format for Vercel AI SDK
 * Transforms database messages into the format expected by useChat hook
 */
export function chatMessageToUIMessage(message: ChatMessage): UIMessage {
  const parts: any[] = [];

  // Add text content if present
  if (message.content) {
    parts.push({ type: "text", text: message.content });
  }

  // Add tool invocations if present
  if (message.tool_invocations && Array.isArray(message.tool_invocations)) {
    // Ensure each tool part has required toolCallId
    const toolParts = message.tool_invocations.map((part: any) => {
      // If toolCallId is missing, generate one
      if (!part.toolCallId) {
        return {
          ...part,
          toolCallId: `${message.id}-tool-${part.type}`,
        };
      }
      return part;
    });
    parts.push(...toolParts);
  }

  return {
    id: message.id,
    role: message.role as "user" | "assistant" | "system",
    parts,
  };
}

/**
 * Convert UIMessage to ChatMessage format for database storage
 * Transforms Vercel AI SDK messages into database format
 */
export function uiMessageToChatMessage(
  message: UIMessage,
  sessionId: string
): Omit<ChatMessage, "created_at"> {
  // Extract text content from parts
  const textParts = message.parts
    ?.filter((part: any) => part.type === "text")
    .map((part: any) => part.text)
    .join("\n");

  // Extract tool invocations if any
  const toolParts = message.parts?.filter((part: any) => part.type.startsWith("tool-"));

  return {
    id: message.id,
    session_id: sessionId,
    role: message.role as "user" | "assistant" | "system",
    content: textParts || "",
    tool_invocations: toolParts && toolParts.length > 0 ? toolParts : undefined,
  };
}
