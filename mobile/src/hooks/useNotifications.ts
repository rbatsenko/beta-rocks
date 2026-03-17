/**
 * Hook for managing user notifications
 * Fetches notifications from API and subscribes to Supabase Realtime for live updates
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/api/supabase";
import { API_URL } from "@/constants/config";
import type { AppNotification } from "@/types/api";

interface UseNotificationsOptions {
  syncKeyHash: string | null;
  userProfileId: string | null;
}

interface UseNotificationsReturn {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotifications({
  syncKeyHash,
  userProfileId,
}: UseNotificationsOptions): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef<ReturnType<
    NonNullable<typeof supabase>["channel"]
  > | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!syncKeyHash) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/notifications?limit=50`,
        {
          headers: { "X-Sync-Key-Hash": syncKeyHash },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setNotifications(
          Array.isArray(data.notifications) ? data.notifications : []
        );
      }
    } catch {
      // silently fail - notifications are non-critical
    } finally {
      setIsLoading(false);
    }
  }, [syncKeyHash]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe to Supabase Realtime for new notifications
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !userProfileId) return;

    const channel = supabase
      .channel(`notifications:${userProfileId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_profile_id=eq.${userProfileId}`,
        },
        (payload) => {
          const newNotification = payload.new as AppNotification;
          setNotifications((prev) => [newNotification, ...prev]);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userProfileId]);

  const markAsRead = useCallback(
    async (ids: string[]) => {
      if (!syncKeyHash || ids.length === 0) return;

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
      );

      try {
        await fetch(`${API_URL}/api/notifications`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Sync-Key-Hash": syncKeyHash,
          },
          body: JSON.stringify({ ids }),
        });
      } catch {
        // Revert on failure
        fetchNotifications();
      }
    },
    [syncKeyHash, fetchNotifications]
  );

  const markAllRead = useCallback(async () => {
    if (!syncKeyHash) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await fetch(`${API_URL}/api/notifications`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Sync-Key-Hash": syncKeyHash,
        },
        body: JSON.stringify({ markAllRead: true }),
      });
    } catch {
      fetchNotifications();
    }
  }, [syncKeyHash, fetchNotifications]);

  const clearAll = useCallback(async () => {
    if (!syncKeyHash) return;

    // Optimistic update
    setNotifications([]);

    try {
      await fetch(`${API_URL}/api/notifications`, {
        method: "DELETE",
        headers: { "X-Sync-Key-Hash": syncKeyHash },
      });
    } catch {
      fetchNotifications();
    }
  }, [syncKeyHash, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllRead,
    clearAll,
    refetch: fetchNotifications,
  };
}
