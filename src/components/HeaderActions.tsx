"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { getUserProfile } from "@/lib/auth/sync-key";

interface HeaderActionsProps {
  onSyncClick: () => void;
  onSettingsClick: () => void;
  onFavoritesClick: () => void;
  onStatsClick: () => void;
  /** Optional extra actions to show before the common actions */
  extraActions?: ReactNode;
  /** Optional callback for about/info action (shown in menu on mobile) */
  onAboutClick?: () => void;
  /** Optional callback for clear chat action (shown in menu on mobile) */
  onClearChatClick?: () => void;
  /** Whether clear chat is disabled */
  isClearChatDisabled?: boolean;
}

export function HeaderActions({
  onSyncClick,
  onSettingsClick,
  onFavoritesClick,
  onStatsClick,
  extraActions,
  onAboutClick,
  onClearChatClick,
  isClearChatDisabled,
}: HeaderActionsProps) {
  const { t } = useClientTranslation("common");
  const syncStatus = useSyncStatus();

  // Only show sync status for users with profiles
  const hasProfile = typeof window !== 'undefined' ? !!getUserProfile() : false;

  return (
    <>
      {hasProfile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onSyncClick}
          className="cursor-pointer hover:bg-muted/50"
          title={t("sync.status.clickToLearnMore")}
        >
          <SyncStatusIndicator status={syncStatus} />
        </Button>
      )}
      {extraActions}
      <LanguageSelector />
      <ThemeToggle />
      <UserMenu
        onSettingsClick={onSettingsClick}
        onFavoritesClick={onFavoritesClick}
        onStatsClick={onStatsClick}
        onAboutClick={onAboutClick}
        onClearChatClick={onClearChatClick}
        isClearChatDisabled={isClearChatDisabled}
      />
    </>
  );
}
