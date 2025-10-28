/**
 * useChatHistory Hook
 *
 * @deprecated This hook is deprecated and no longer used. Use React Query hooks from
 * @/hooks/queries/useChatQueries instead:
 * - useCurrentSession() - Get or create current session
 * - useChatMessages(sessionId) - Load messages for a session
 * - useSendMessage() - Send messages with optimistic updates
 * - useClearSession() - Clear current session
 * - useClearAllHistory() - Delete all history
 *
 * This file is kept for reference only and should not be used in new code.
 *
 * ---
 *
 * OLD DESCRIPTION:
 * Integrates chat history persistence with Vercel AI SDK's useChat hook.
 * Handles loading history on mount and saving messages as they arrive.
 * If initialSessionId is provided (from SSR), skips the loading state.
 */

import { useState, useEffect, useCallback } from "react";
import type { UIMessage } from "ai";
import {
  loadChatHistory,
  saveChatMessage,
  startNewChat,
  clearAllChatHistory,
  syncFromSupabase,
} from "@/lib/chat/history.service";

export function useChatHistory(initialSessionId?: string) {
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  // Always start with loading state
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load history on mount
  useEffect(() => {
    // If we have initialSessionId from server, try localStorage first
    if (initialSessionId) {
      // Read from localStorage synchronously
      const stored = localStorage.getItem("temps_chat_messages");
      if (stored) {
        try {
          const messages = JSON.parse(stored);
          // Filter for current session
          const sessionMessages = messages.filter((m: any) => m.session_id === initialSessionId);

          // If we found messages in localStorage, use them
          if (sessionMessages.length > 0) {
            // Sort by created_at to ensure correct chronological order (oldest first)
            const sortedMessages = [...sessionMessages].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

            // Convert to UIMessage format
            const uiMessages = sortedMessages.map((msg: any) => {
              const parts: any[] = [];
              if (msg.content) {
                parts.push({ type: "text", text: msg.content });
              }
              if (msg.tool_invocations && Array.isArray(msg.tool_invocations)) {
                parts.push(...msg.tool_invocations);
              }
              return {
                id: msg.id,
                role: msg.role,
                parts,
              };
            });
            setInitialMessages(uiMessages);
            setIsLoadingHistory(false);

            // Sync from DB in background (non-blocking) - both chat and favorites
            Promise.all([
              syncFromSupabase().catch((err) =>
                console.error("[useChatHistory] Background chat sync failed:", err)
              ),
              import("@/lib/storage/favorites")
                .then((mod) => mod.syncFavoritesFromSupabase())
                .catch((err) =>
                  console.error("[useChatHistory] Background favorites sync failed:", err)
                ),
            ]);

            return; // Skip async loading
          }
        } catch (err) {
          console.error("Failed to read from localStorage:", err);
        }
      }

      // localStorage was empty or failed - fall back to loading from DB
      console.log(
        "[useChatHistory] localStorage empty, loading from DB for session:",
        initialSessionId
      );
    }

    // Load from DB (either no SSR session ID, or localStorage was empty)
    loadChatHistory()
      .then((messages) => {
        setInitialMessages(messages);
      })
      .catch((err) => {
        console.error("Failed to load chat history:", err);
      })
      .finally(() => {
        setIsLoadingHistory(false);
      });
  }, [initialSessionId]);

  // Bidirectional sync: pull DB updates when window gains focus
  useEffect(() => {
    const handleFocus = async () => {
      console.log("[useChatHistory] Window focused, syncing from DB...");
      // Sync both chat messages and favorites
      await Promise.all([
        syncFromSupabase().catch((err) => console.error("[useChatHistory] Chat sync failed:", err)),
        import("@/lib/storage/favorites")
          .then((mod) => mod.syncFavoritesFromSupabase())
          .catch((err) => console.error("[useChatHistory] Favorites sync failed:", err)),
      ]);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // Save a message (called when new messages arrive)
  const saveMessage = useCallback(async (message: UIMessage) => {
    if (!message.id || !message.role || !message.parts) return;

    try {
      // Extract text content from parts
      const textParts = message.parts
        .filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("\n");

      // Extract tool invocations if any
      const toolParts = message.parts.filter((part: any) => part.type.startsWith("tool-"));

      await saveChatMessage(
        message.id,
        message.role as "user" | "assistant" | "system",
        textParts || "",
        toolParts.length > 0 ? toolParts : undefined
      );
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  }, []);

  // Start a new chat session
  const handleNewChat = useCallback(async () => {
    try {
      await startNewChat();
      setInitialMessages([]);
      // Navigate to home to reset the chat interface (preserves cookies/language)
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to start new chat:", error);
    }
  }, []);

  // Clear all history
  const handleClearHistory = useCallback(async () => {
    try {
      await clearAllChatHistory();
      setInitialMessages([]);
      // Navigate to home to reset the chat interface (preserves cookies/language)
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  }, []);

  return {
    initialMessages,
    isLoadingHistory,
    saveMessage,
    handleNewChat,
    handleClearHistory,
  };
}
