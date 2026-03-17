"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface AppNotification {
  id: string;
  user_profile_id: string;
  type: string;
  title: string;
  body: string;
  data: {
    cragId: string;
    cragSlug: string;
    cragName: string;
    reportId: string;
    category: string;
  };
  read: boolean;
  created_at: string;
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

export function useNotifications(
  syncKeyHash: string | null,
  userProfileId: string | null
): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseClient>["channel"]> | null>(
    null
  );

  const fetchNotifications = useCallback(async () => {
    if (!syncKeyHash) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/notifications?syncKeyHash=${encodeURIComponent(syncKeyHash)}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [syncKeyHash]);

  // Initial fetch
  useEffect(() => {
    if (syncKeyHash) {
      fetchNotifications();
    }
  }, [syncKeyHash, fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!userProfileId || !isSupabaseConfigured) return;

    const supabase = getSupabaseClient();
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
          setUnreadCount((prev) => prev + 1);

          // Show toast notification for the new notification
          toast({
            title: newNotification.data?.cragName || newNotification.title,
            description: newNotification.body,
            duration: 5000,
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userProfileId]);

  const markAsRead = useCallback(
    async (ids: string[]) => {
      if (!syncKeyHash || ids.length === 0) return;

      try {
        const res = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ syncKeyHash, ids }),
        });

        if (res.ok) {
          setNotifications((prev) =>
            prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
          );
          setUnreadCount((prev) => Math.max(0, prev - ids.length));
        }
      } catch (error) {
        console.error("Failed to mark notifications as read:", error);
      }
    },
    [syncKeyHash]
  );

  const markAllRead = useCallback(async () => {
    if (!syncKeyHash) return;

    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncKeyHash, markAllRead: true }),
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }, [syncKeyHash]);

  const clearAll = useCallback(async () => {
    if (!syncKeyHash) return;

    try {
      const res = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncKeyHash }),
      });

      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  }, [syncKeyHash]);

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
