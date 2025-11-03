"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ProfileCreationModal } from "@/components/profile/ProfileCreationModal";
import { ProfileCreatedDialog } from "@/components/profile/ProfileCreatedDialog";
import { UserMenuContent } from "@/components/profile/UserMenuContent";
import type { UserProfile as UserProfileType } from "@/lib/auth/sync-key";

interface UserMenuProps {
  onSettingsClick: () => void;
  onStatsClick: () => void;
  onFavoritesClick: () => void;
  onAboutClick?: () => void;
  onClearChatClick?: () => void;
  isClearChatDisabled?: boolean;
}

export function UserMenu({
  onSettingsClick,
  onStatsClick,
  onFavoritesClick,
  onAboutClick,
  onClearChatClick,
  isClearChatDisabled,
}: UserMenuProps) {
  const { t } = useClientTranslation("common");
  const { data: userProfile, isLoading } = useUserProfile();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProfileCreated, setShowProfileCreated] = useState(false);
  const [newSyncKey, setNewSyncKey] = useState<string>("");

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

  const handleProfileCreated = (profile: UserProfileType) => {
    setNewSyncKey(profile.syncKey);
    setShowProfileModal(false);
    setShowProfileCreated(true);
    // Reload page to ensure proper initialization with new profile
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  // No profile - show menu with basic options
  if (!userProfile && !isLoading) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="rounded-full h-10 w-10 p-0">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium leading-none">{t("profile.anonymous")}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <UserMenuContent
              onFavoritesClick={onFavoritesClick}
              onStatsClick={onStatsClick}
              onSettingsClick={onSettingsClick}
              onAboutClick={onAboutClick}
              onClearChatClick={onClearChatClick}
              isClearChatDisabled={isClearChatDisabled}
            />
          </DropdownMenuContent>
        </DropdownMenu>

        <ProfileCreationModal
          open={showProfileModal}
          onOpenChange={setShowProfileModal}
          trigger="manual"
          onCreated={handleProfileCreated}
        />

        <ProfileCreatedDialog
          open={showProfileCreated}
          onOpenChange={setShowProfileCreated}
          syncKey={newSyncKey}
          completedAction=""
        />
      </>
    );
  }

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
        <UserMenuContent
          onFavoritesClick={onFavoritesClick}
          onStatsClick={onStatsClick}
          onSettingsClick={onSettingsClick}
          onAboutClick={onAboutClick}
          onClearChatClick={onClearChatClick}
          isClearChatDisabled={isClearChatDisabled}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
