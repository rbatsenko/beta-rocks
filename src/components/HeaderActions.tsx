"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Search, Star } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { useClientTranslation } from "@/hooks/useClientTranslation";

interface HeaderActionsProps {
  onSettingsClick: () => void;
  onFavoritesClick: () => void;
  onStatsClick: () => void;
  onSearchClick: () => void;
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
  onSettingsClick,
  onFavoritesClick,
  onStatsClick,
  onSearchClick,
  extraActions,
  onAboutClick,
  onClearChatClick,
  isClearChatDisabled,
}: HeaderActionsProps) {
  const { t } = useClientTranslation("common");

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={onSearchClick}
        className="cursor-pointer hover:bg-muted/50"
        title="Search crags (⌘K)"
      >
        <Search className="h-[1.2rem] w-[1.2rem]" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onFavoritesClick}
        className="cursor-pointer hover:bg-muted/50 hidden md:flex"
        title={t("profile.favorites")}
      >
        <Star className="h-[1.2rem] w-[1.2rem]" />
      </Button>
      {extraActions}
      <LanguageSelector />
      <ThemeToggle />
      <UserMenu
        onSettingsClick={onSettingsClick}
        onStatsClick={onStatsClick}
        onAboutClick={onAboutClick}
        onClearChatClick={onClearChatClick}
        isClearChatDisabled={isClearChatDisabled}
      />
    </>
  );
}
