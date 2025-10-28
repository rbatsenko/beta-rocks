/**
 * useSyncStatus Hook
 *
 * Tracks the sync status of local data with Supabase.
 * Returns current sync status: "synced", "syncing", or "offline"
 */

import { useState, useEffect } from "react";

type SyncStatus = "synced" | "syncing" | "offline";

const STORAGE_KEY = "temps_last_sync";
const SYNC_STATUS_EVENT = "temps_sync_status_change";

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>("synced");

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => {
      if (!navigator.onLine) {
        setStatus("offline");
      } else if (status === "offline") {
        // When coming back online, show as syncing briefly
        setStatus("syncing");
        setTimeout(() => setStatus("synced"), 1000);
      }
    };

    updateOnlineStatus();

    // Listen for online/offline events
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Listen for custom sync status events from history service
    const handleSyncStatusChange = (event: Event) => {
      const customEvent = event as CustomEvent<SyncStatus>;
      if (navigator.onLine) {
        setStatus(customEvent.detail);
      }
    };

    window.addEventListener(SYNC_STATUS_EVENT, handleSyncStatusChange);

    // Check last sync time on mount
    const lastSync = localStorage.getItem(STORAGE_KEY);
    if (lastSync && navigator.onLine) {
      const lastSyncTime = new Date(lastSync);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSyncTime.getTime()) / 1000 / 60;

      // If last sync was more than 5 minutes ago, show as potentially out of sync
      if (diffMinutes > 5) {
        setStatus("syncing");
        // Reset to synced after a delay (assuming sync completes)
        setTimeout(() => {
          setStatus("synced");
        }, 2000);
      }
    }

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      window.removeEventListener(SYNC_STATUS_EVENT, handleSyncStatusChange);
    };
  }, []);

  return status;
}

/**
 * Utility function to trigger sync status change events
 * Should be called from the history service when syncing starts/completes
 */
export function emitSyncStatus(status: SyncStatus) {
  const event = new CustomEvent(SYNC_STATUS_EVENT, { detail: status });
  window.dispatchEvent(event);
}
