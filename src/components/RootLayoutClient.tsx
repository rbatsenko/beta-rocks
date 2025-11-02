"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { HeaderActions } from "@/components/HeaderActions";
import { SettingsDialog } from "@/components/SettingsDialog";
import { FavoritesDialog } from "@/components/FavoritesDialog";
import { StatsDialog } from "@/components/StatsDialog";
import { SyncExplainerDialog } from "@/components/SyncExplainerDialog";
import { SearchDialog } from "@/components/SearchDialog";

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [favoritesDialogOpen, setFavoritesDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [syncExplainerDialogOpen, setSyncExplainerDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

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

  // Show header on location pages
  const showHeader = pathname?.startsWith("/location");

  return (
    <>
      {showHeader && (
        <Header
          actions={
            <HeaderActions
              onSearchClick={() => setSearchDialogOpen(true)}
              onSettingsClick={() => setSettingsDialogOpen(true)}
              onFavoritesClick={() => setFavoritesDialogOpen(true)}
              onStatsClick={() => setStatsDialogOpen(true)}
            />
          }
        />
      )}
      {children}

      {/* Global dialogs - available everywhere */}
      <SearchDialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen} />
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
