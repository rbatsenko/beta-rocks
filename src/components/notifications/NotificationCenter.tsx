"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { NotificationDropdown } from "./NotificationDropdown";

/**
 * Self-contained notification center — drop into HeaderActions.
 * Handles its own data fetching, realtime subscription, and navigation.
 */
export function NotificationCenter() {
  const { data: profile } = useUserProfile();
  const syncKeyHash = profile?.syncKeyHash ?? null;
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllRead,
    clearAll,
  } = useNotifications(syncKeyHash);
  const [open, setOpen] = useState(false);
  const router = useRouter();

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
