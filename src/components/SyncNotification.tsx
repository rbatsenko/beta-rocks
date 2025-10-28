"use client";

import { useState, useEffect } from "react";
import { X, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientTranslation } from "@/hooks/useClientTranslation";

const NOTIFICATION_DISMISSED_KEY = "temps_sync_notification_dismissed";

interface SyncNotificationProps {
  onViewInSettings: () => void;
  onViewMore: () => void;
}

export function SyncNotification({ onViewInSettings, onViewMore }: SyncNotificationProps) {
  const { t } = useClientTranslation("common");
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem(NOTIFICATION_DISMISSED_KEY);
    setIsDismissed(dismissed === "true");
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(NOTIFICATION_DISMISSED_KEY, "true");
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  return (
    <div className="mb-6 max-w-md mx-auto">
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4 text-left relative">
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <Key className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
              {t("sync.notification.title")}
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
              {t("sync.notification.description")}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onViewInSettings();
                  handleDismiss();
                }}
                className="h-8 text-xs border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50"
              >
                {t("sync.notification.viewInSettings")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onViewMore();
                  handleDismiss();
                }}
                className="h-8 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50"
              >
                {t("sync.notification.viewMore")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
