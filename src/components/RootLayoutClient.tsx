"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { HeaderActions } from "@/components/HeaderActions";
import { SettingsDialog } from "@/components/SettingsDialog";
import { FavoritesDialog } from "@/components/FavoritesDialog";
import { StatsDialog } from "@/components/StatsDialog";
import { SyncExplainerDialog } from "@/components/SyncExplainerDialog";
import { useUserProfile } from "@/hooks/useUserProfile";

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [favoritesDialogOpen, setFavoritesDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [syncExplainerDialogOpen, setSyncExplainerDialogOpen] = useState(false);

  // Prefetch user profile on app load (caches it globally)
  useUserProfile();

  // Show header on location pages
  const showHeader = pathname?.startsWith("/location");

  return (
    <>
      {showHeader && (
        <Header
          actions={
            <HeaderActions
              onSyncClick={() => setSyncExplainerDialogOpen(true)}
              onSettingsClick={() => setSettingsDialogOpen(true)}
              onFavoritesClick={() => setFavoritesDialogOpen(true)}
              onStatsClick={() => setStatsDialogOpen(true)}
            />
          }
        />
      )}
      {children}

      {/* Global dialogs - available everywhere */}
      <SettingsDialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen} />
      <FavoritesDialog open={favoritesDialogOpen} onOpenChange={setFavoritesDialogOpen} />
      <StatsDialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen} />
      <SyncExplainerDialog
        open={syncExplainerDialogOpen}
        onOpenChange={setSyncExplainerDialogOpen}
        onOpenSettings={() => setSettingsDialogOpen(true)}
      />
    </>
  );
}
