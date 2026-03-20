"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { NotificationDropdown } from "./NotificationDropdown";

/**
 * Self-contained notification center — drop into HeaderActions.
 * Handles its own data fetching, realtime subscription, and navigation.
 * Also syncs the user's locale to the database for translated push notifications.
 */
export function NotificationCenter() {
  const { data: profile } = useUserProfile();
  const syncKeyHash = profile?.syncKeyHash ?? null;
  const { language } = useClientTranslation("common");
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllRead,
    clearAll,
  } = useNotifications(syncKeyHash);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const localeSynced = useRef(false);

  // Sync locale to user profile for translated push notifications
  useEffect(() => {
    if (!syncKeyHash || !language || localeSynced.current) return;
    localeSynced.current = true;
    fetch("/api/push-subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncKeyHash, locale: language }),
    }).catch(() => {});
  }, [syncKeyHash, language]);

  if (!profile) return null;

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.read) {
      markAsRead([notification.id]);
    }
    setOpen(false);
    if (notification.data?.cragSlug) {
      router.push(`/location/${notification.data.cragSlug}`);
    }
  };

  return (
    <NotificationDropdown
      notifications={notifications}
      unreadCount={unreadCount}
      onMarkAllRead={markAllRead}
      onClearAll={clearAll}
      onNotificationClick={handleNotificationClick}
      open={open}
      onOpenChange={setOpen}
    />
  );
}
