"use client";

import { Bell, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { type AppNotification } from "@/hooks/useNotifications";
import { NotificationBell } from "./NotificationBell";

const CATEGORY_COLORS: Record<string, string> = {
  conditions: "bg-blue-500",
  safety: "bg-red-500",
  access: "bg-yellow-500",
  climbing_info: "bg-cyan-500",
  facilities: "bg-purple-500",
  other: "bg-gray-500",
};

function getRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

interface NotificationDropdownProps {
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onNotificationClick: (notification: AppNotification) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  onMarkAllRead,
  onClearAll,
  onNotificationClick,
  open,
  onOpenChange,
}: NotificationDropdownProps) {
  const { t } = useClientTranslation("common");

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <div>
          <NotificationBell unreadCount={unreadCount} onClick={() => onOpenChange(!open)} />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">
            {t("notifications.title", "Notifications")}
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllRead}
              className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Check className="h-3 w-3 mr-1" />
              {t("notifications.markAllRead", "Mark all read")}
            </Button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-8 w-8 mb-3 opacity-40" />
              <p className="text-sm">{t("notifications.empty", "No notifications yet")}</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const category = notification.data?.category || "other";
              const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;

              return (
                <button
                  key={notification.id}
                  onClick={() => onNotificationClick(notification)}
                  className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer ${
                    !notification.read ? "bg-muted/30" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Category dot */}
                    <span
                      className={`mt-1.5 flex-shrink-0 h-2.5 w-2.5 rounded-full ${colorClass}`}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {notification.data?.cragName || notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.body}
                      </p>
                    </div>

                    {/* Time */}
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
                      {getRelativeTime(notification.created_at)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="w-full h-auto py-1.5 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              {t("notifications.clearAll", "Clear all")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
