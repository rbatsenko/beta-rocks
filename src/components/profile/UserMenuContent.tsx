"use client";

import { Star, BarChart3, Info, RotateCcw, Settings } from "lucide-react";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import { ThemeToggle } from "@/components/common/ThemeToggle";

interface UserMenuContentProps {
  onFavoritesClick: () => void;
  onStatsClick: () => void;
  onSettingsClick: () => void;
  onAboutClick?: () => void;
  onClearChatClick?: () => void;
  isClearChatDisabled?: boolean;
}

/**
 * Shared menu content for UserMenu dropdown
 * Handles favorites, stats, language/theme settings, and other actions
 */
export function UserMenuContent({
  onFavoritesClick,
  onStatsClick,
  onSettingsClick,
  onAboutClick,
  onClearChatClick,
  isClearChatDisabled,
}: UserMenuContentProps) {
  const { t } = useClientTranslation("common");

  return (
    <>
      <DropdownMenuItem onClick={onFavoritesClick} className="cursor-pointer">
        <Star className="mr-2 h-4 w-4" />
        <span>{t("profile.favorites")}</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onStatsClick} className="cursor-pointer">
        <BarChart3 className="mr-2 h-4 w-4" />
        <span>{t("profile.stats")}</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <div className="md:hidden px-2 py-1.5 flex items-center justify-between gap-2">
        <span className="text-sm">{t("ui.language")}</span>
        <LanguageSelector />
      </div>
      <div className="md:hidden px-2 py-1.5 flex items-center justify-between gap-2">
        <span className="text-sm">{t("ui.theme")}</span>
        <ThemeToggle />
      </div>
      <DropdownMenuSeparator className="md:hidden" />
      {onAboutClick && (
        <DropdownMenuItem onClick={onAboutClick} className="cursor-pointer md:hidden">
          <Info className="mr-2 h-4 w-4" />
          <span>{t("ui.aboutApp")}</span>
        </DropdownMenuItem>
      )}
      {onClearChatClick && (
        <DropdownMenuItem
          onClick={onClearChatClick}
          className="cursor-pointer md:hidden"
          disabled={isClearChatDisabled}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          <span>{t("chat.clearChat")}</span>
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={onSettingsClick} className="cursor-pointer">
        <Settings className="mr-2 h-4 w-4" />
        <span>{t("profile.settings")}</span>
      </DropdownMenuItem>
    </>
  );
}
