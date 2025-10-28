"use client";

import { useState, useEffect } from "react";
import { User, Settings, Star, BarChart3, Info, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initializeUserProfile, type UserProfile } from "@/lib/auth/sync-key";
import { useClientTranslation } from "@/hooks/useClientTranslation";

interface UserMenuProps {
  onSettingsClick: () => void;
  onFavoritesClick: () => void;
  onStatsClick: () => void;
  onAboutClick?: () => void;
  onClearChatClick?: () => void;
  isClearChatDisabled?: boolean;
}

export function UserMenu({
  onSettingsClick,
  onFavoritesClick,
  onStatsClick,
  onAboutClick,
  onClearChatClick,
  isClearChatDisabled,
}: UserMenuProps) {
  const { t } = useClientTranslation("common");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await initializeUserProfile();
        setUserProfile(profile);
      } catch (error) {
        console.error("Failed to initialize user profile:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  // Get initials for avatar
  const getInitials = () => {
    if (userProfile?.displayName) {
      return userProfile.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return "U";
  };

  // Get display name or fallback
  const getDisplayName = () => {
    if (userProfile?.displayName) {
      return userProfile.displayName;
    }
    // Use last 4 chars of sync key as identifier
    if (userProfile?.syncKey) {
      return `Climber #${userProfile.syncKey.slice(-4)}`;
    }
    return t("profile.anonymous");
  };

  if (isLoading) {
    return (
      <Button variant="ghost" className="rounded-full h-10 w-10 p-0" disabled>
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-muted">
            <User className="h-5 w-5 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="rounded-full h-10 w-10 p-0">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-orange-500 text-white">{getInitials()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userProfile?.displayName ? t("profile.member") : t("profile.anonymousMember")}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onFavoritesClick} className="cursor-pointer">
          <Star className="mr-2 h-4 w-4" />
          <span>{t("profile.favorites")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onStatsClick} className="cursor-pointer">
          <BarChart3 className="mr-2 h-4 w-4" />
          <span>{t("profile.stats")}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
