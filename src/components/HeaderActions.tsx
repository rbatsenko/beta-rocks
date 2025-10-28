"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { useSyncStatus } from "@/hooks/useSyncStatus";

interface HeaderActionsProps {
  onSyncClick: () => void;
  onSettingsClick: () => void;
  onFavoritesClick: () => void;
  /** Optional extra actions to show before the common actions */
  extraActions?: ReactNode;
}

export function HeaderActions({
  onSyncClick,
  onSettingsClick,
  onFavoritesClick,
  extraActions,
}: HeaderActionsProps) {
  const { t } = useClientTranslation("common");
  const syncStatus = useSyncStatus();

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={onSyncClick}
        className="cursor-pointer hover:bg-muted/50"
        title={t("sync.status.clickToLearnMore")}
      >
        <SyncStatusIndicator status={syncStatus} />
      </Button>
      {extraActions}
      <LanguageSelector />
      <ThemeToggle />
      <UserMenu onSettingsClick={onSettingsClick} onFavoritesClick={onFavoritesClick} />
    </>
  );
}
