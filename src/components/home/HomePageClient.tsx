"use client";

import { useState } from "react";
import { WelcomeScreen } from "@/components/home/WelcomeScreen";
import { FeaturesDialog } from "@/components/dialogs/FeaturesDialog";
import { PrivacyDialog } from "@/components/dialogs/PrivacyDialog";

export function HomePageClient() {
  const [featuresDialogOpen, setFeaturesDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);

  // Trigger ⌘K search dialog from the global RootLayoutClient
  const handleSearchClick = () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
    );
  };

  return (
    <>
      <WelcomeScreen
        onSearchClick={handleSearchClick}
        onAboutClick={() => setFeaturesDialogOpen(true)}
        onPrivacyClick={() => setPrivacyDialogOpen(true)}
      />
      <FeaturesDialog open={featuresDialogOpen} onOpenChange={setFeaturesDialogOpen} />
      <PrivacyDialog open={privacyDialogOpen} onOpenChange={setPrivacyDialogOpen} />
    </>
  );
}
