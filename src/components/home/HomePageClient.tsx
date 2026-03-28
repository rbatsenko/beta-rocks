"use client";

import { WelcomeScreen } from "@/components/home/WelcomeScreen";

export function HomePageClient() {
  // Trigger ⌘K search dialog from the global RootLayoutClient
  const handleSearchClick = () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
    );
  };

  return <WelcomeScreen onSearchClick={handleSearchClick} />;
}
