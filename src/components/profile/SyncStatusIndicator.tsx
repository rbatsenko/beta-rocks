"use client";

import { Cloud, CloudOff } from "lucide-react";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { cn } from "@/lib/utils";

interface SyncStatusIndicatorProps {
  status: "synced" | "syncing" | "offline";
  className?: string;
}

export function SyncStatusIndicator({ status, className }: SyncStatusIndicatorProps) {
  const { t } = useClientTranslation("common");

  const getStatusColor = () => {
    switch (status) {
      case "synced":
        return "text-green-500";
      case "syncing":
        return "text-orange-500";
      case "offline":
        return "text-muted-foreground";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "synced":
        return t("sync.status.synced");
      case "syncing":
        return t("sync.status.syncing");
      case "offline":
        return t("sync.status.offline");
    }
  };

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", className)} title={getStatusText()}>
      {status === "offline" ? (
        <CloudOff className={cn("h-4 w-4", getStatusColor())} />
      ) : (
        <Cloud
          className={cn("h-4 w-4", getStatusColor(), status === "syncing" && "animate-pulse")}
        />
      )}
    </div>
  );
}
