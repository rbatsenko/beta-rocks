"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { HeaderActions } from "@/components/layout/HeaderActions";
import { SettingsDialog } from "@/components/profile/SettingsDialog";
import { FavoritesDialog } from "@/components/profile/FavoritesDialog";
import { StatsDialog } from "@/components/profile/StatsDialog";
import { SyncExplainerDialog } from "@/components/profile/SyncExplainerDialog";
import { SearchDialog } from "@/components/dialogs/SearchDialog";
import { FeaturesDialog } from "@/components/dialogs/FeaturesDialog";
import { ProfileCreationModal } from "@/components/profile/ProfileCreationModal";
import { ProfileCreatedDialog } from "@/components/profile/ProfileCreatedDialog";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { getUserProfile, type UserProfile } from "@/lib/auth/sync-key";

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [favoritesDialogOpen, setFavoritesDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [syncExplainerDialogOpen, setSyncExplainerDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [featuresDialogOpen, setFeaturesDialogOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProfileCreated, setShowProfileCreated] = useState(false);
  const [newSyncKey, setNewSyncKey] = useState<string>("");
  const [pendingAction, setPendingAction] = useState<"favorites" | "stats" | "settings" | null>(
    null
  );

  // ⌘K keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchDialogOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Profile creation is now on-demand (when user favorites, reports, or votes)
  // This prevents database bloat from casual visitors

  // Handle profile creation completion
  const handleProfileCreated = (profile: UserProfile) => {
    setNewSyncKey(profile.syncKey);
    setShowProfileModal(false);
    setShowProfileCreated(true);

    // Complete the pending action after profile creation
    if (pendingAction === "favorites") {
      setFavoritesDialogOpen(true);
    } else if (pendingAction === "stats") {
      setStatsDialogOpen(true);
    } else if (pendingAction === "settings") {
      setSettingsDialogOpen(true);
    }

    setPendingAction(null);
  };

  // Handle clicks with profile requirement check
  const handleFavoritesClick = () => {
    const profile = getUserProfile();
    if (!profile) {
      setPendingAction("favorites");
      setShowProfileModal(true);
      return;
    }
    setFavoritesDialogOpen(true);
  };

  const handleStatsClick = () => {
    const profile = getUserProfile();
    if (!profile) {
      setPendingAction("stats");
      setShowProfileModal(true);
      return;
    }
    setStatsDialogOpen(true);
  };

  const handleSettingsClick = () => {
    const profile = getUserProfile();
    if (!profile) {
      setPendingAction("settings");
      setShowProfileModal(true);
      return;
    }
    setSettingsDialogOpen(true);
  };

  // Show header on location pages and feed page
  const showHeader = pathname?.startsWith("/location") || pathname === "/feed";

  // Show FAB on most pages except sync page
  const showFAB = pathname !== "/sync";

  return (
    <>
      {showHeader && (
        <Header
          actions={
            <HeaderActions
              onSearchClick={() => setSearchDialogOpen(true)}
              onSettingsClick={handleSettingsClick}
              onFavoritesClick={handleFavoritesClick}
              onStatsClick={handleStatsClick}
              onAboutClick={() => setFeaturesDialogOpen(true)}
            />
          }
        />
      )}
      {children}

      {/* Floating Action Button */}
      {showFAB && <FloatingActionButton />}

      {/* Global dialogs - available everywhere */}
      <SearchDialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen} />
      <SettingsDialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen} />
      <FavoritesDialog open={favoritesDialogOpen} onOpenChange={setFavoritesDialogOpen} />
      <StatsDialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen} />
      <FeaturesDialog open={featuresDialogOpen} onOpenChange={setFeaturesDialogOpen} />
      <SyncExplainerDialog
        open={syncExplainerDialogOpen}
        onOpenChange={setSyncExplainerDialogOpen}
        onOpenSettings={() => setSettingsDialogOpen(true)}
      />

      {/* Profile Creation Modal */}
      <ProfileCreationModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        trigger="manual"
        onCreated={handleProfileCreated}
      />

      {/* Profile Created Dialog */}
      <ProfileCreatedDialog
        open={showProfileCreated}
        onOpenChange={setShowProfileCreated}
        syncKey={newSyncKey}
        completedAction=""
      />
    </>
  );
}
