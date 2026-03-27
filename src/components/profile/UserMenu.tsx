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
import { UserReportsDialog } from "@/components/profile/UserReportsDialog";
import { AddCragModal } from "@/components/dialogs/AddCragModal";
import type { UserProfile as UserProfileType } from "@/lib/auth/sync-key";

// Map locale codes to flag emojis
const localeFlagMap: Record<string, string> = {
  en: "🇬🇧",
  "en-AU": "🇦🇺",
  "en-CA": "🇨🇦",
  "en-GB": "🇬🇧",
  "bg-BG": "🇧🇬",
  "ca-AD": "🇦🇩",
  "cs-CZ": "🇨🇿",
  "da-DK": "🇩🇰",
  "de-AT": "🇦🇹",
  "de-CH": "🇨🇭",
  "de-DE": "🇩🇪",
  "el-GR": "🇬🇷",
  "es-ES": "🇪🇸",
  "fi-FI": "🇫🇮",
  "fr-BE": "🇧🇪",
  "fr-CA": "🇨🇦",
  "fr-CH": "🇨🇭",
  "fr-FR": "🇫🇷",
  "hr-HR": "🇭🇷",
  "it-CH": "🇨🇭",
  "it-IT": "🇮🇹",
  "nb-NO": "🇳🇴",
  "nl-BE": "🇧🇪",
  pl: "🇵🇱",
  "pt-PT": "🇵🇹",
  "ro-RO": "🇷🇴",
  "sk-SK": "🇸🇰",
  "sl-SI": "🇸🇮",
  "sv-SE": "🇸🇪",
  uk: "🇺🇦",
};

interface UserMenuProps {
  onSettingsClick: () => void;
  onStatsClick: () => void;
  onFavoritesClick: () => void;
  onAboutClick?: () => void;
}

export function UserMenu({
  onSettingsClick,
  onStatsClick,
  onFavoritesClick,
  onAboutClick,
}: UserMenuProps) {
  const { t, i18n } = useClientTranslation("common");
  const { data: userProfile, isLoading } = useUserProfile();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProfileCreated, setShowProfileCreated] = useState(false);
  const [newSyncKey, setNewSyncKey] = useState<string>("");
  const [showReportsDialog, setShowReportsDialog] = useState(false);
  const [showAddCragModal, setShowAddCragModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<"reports" | "addCrag" | null>(null);

  // Get flag emoji for current language
  const currentFlag = localeFlagMap[i18n.language] || "🌐";

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

    // Complete pending action after profile creation
    if (pendingAction === "reports") {
      setShowReportsDialog(true);
    } else if (pendingAction === "addCrag") {
      setShowAddCragModal(true);
    }
    setPendingAction(null);

    // Reload page to ensure proper initialization with new profile
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  // Handle clicks that require profile in no-profile state
  const handleReportsClick = () => {
    if (!userProfile) {
      setPendingAction("reports");
      setShowProfileModal(true);
      return;
    }
    setShowReportsDialog(true);
  };

  const handleAddCragClick = () => {
    if (!userProfile) {
      setPendingAction("addCrag");
      setShowProfileModal(true);
      return;
    }
    setShowAddCragModal(true);
  };

  // No profile - show menu with basic options
  if (!userProfile && !isLoading) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="rounded-full h-10 w-10 p-0 relative">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              {/* Language flag badge - only on mobile where language selector is hidden */}
              <span className="md:hidden absolute -bottom-0.5 -right-0.5 text-xs leading-none bg-background rounded-full shadow-sm w-4 h-4 flex items-center justify-center">
                {currentFlag}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium leading-none">{t("profile.anonymous")}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <UserMenuContent
              onFavoritesClick={onFavoritesClick}
              onReportsClick={handleReportsClick}
              onStatsClick={onStatsClick}
              onSettingsClick={onSettingsClick}
              onAboutClick={onAboutClick}
              onAddCragClick={handleAddCragClick}
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

        <AddCragModal open={showAddCragModal} onOpenChange={setShowAddCragModal} />
      </>
    );
  }

  if (isLoading) {
    return (
      <Button variant="ghost" className="rounded-full h-10 w-10 p-0 relative" disabled>
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-muted">
            <User className="h-5 w-5 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        {/* Language flag badge - only on mobile where language selector is hidden */}
        <span className="md:hidden absolute -bottom-0.5 -right-0.5 text-xs leading-none bg-background rounded-full shadow-sm w-4 h-4 flex items-center justify-center">
          {currentFlag}
        </span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="rounded-full h-10 w-10 p-0 relative">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-orange-500 text-white">{getInitials()}</AvatarFallback>
          </Avatar>
          {/* Language flag badge - only on mobile where language selector is hidden */}
          <span className="md:hidden absolute -bottom-0.5 -right-0.5 text-xs leading-none bg-background rounded-full shadow-sm w-4 h-4 flex items-center justify-center">
            {currentFlag}
          </span>
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
          onReportsClick={handleReportsClick}
          onStatsClick={onStatsClick}
          onSettingsClick={onSettingsClick}
          onAboutClick={onAboutClick}
          onAddCragClick={handleAddCragClick}
        />
      </DropdownMenuContent>
      <UserReportsDialog open={showReportsDialog} onOpenChange={setShowReportsDialog} />
      <AddCragModal open={showAddCragModal} onOpenChange={setShowAddCragModal} />
    </DropdownMenu>
  );
}
