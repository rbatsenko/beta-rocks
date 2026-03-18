/**
 * Shared notifications context — single source of truth for notification state.
 * Avoids duplicate API calls and ensures badge counts update everywhere instantly.
 */

import { createContext, useContext, type ReactNode } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { AppNotification } from "@/types/api";

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  refetch: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  markAsRead: async () => {},
  markAllRead: async () => {},
  clearAll: async () => {},
  refetch: async () => {},
});

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { syncKeyHash, profileId } = useUserProfile();
  const value = useNotifications({ syncKeyHash, userProfileId: profileId });

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  return useContext(NotificationsContext);
}
