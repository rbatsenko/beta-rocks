"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { HeaderActions } from "@/components/HeaderActions";
import { SettingsDialog } from "@/components/SettingsDialog";
import { FavoritesDialog } from "@/components/FavoritesDialog";
import { StatsDialog } from "@/components/StatsDialog";
import { SyncExplainerDialog } from "@/components/SyncExplainerDialog";

export default function LocationLayout({ children }: { children: React.ReactNode }) {
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [favoritesDialogOpen, setFavoritesDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [syncExplainerDialogOpen, setSyncExplainerDialogOpen] = useState(false);

  return (
    <>
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
      {children}

      {/* Global dialogs */}
      <SettingsDialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen} />
      <FavoritesDialog open={favoritesDialogOpen} onOpenChange={setFavoritesDialogOpen} />
      <StatsDialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen} />
      <SyncExplainerDialog open={syncExplainerDialogOpen} onOpenChange={setSyncExplainerDialogOpen} />
    </>
  );
}

