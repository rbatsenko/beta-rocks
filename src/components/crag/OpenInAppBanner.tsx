"use client";

import { useState, useSyncExternalStore } from "react";
import { X, Smartphone } from "lucide-react";
import { useClientTranslation } from "@/hooks/useClientTranslation";

function getIsMobileBrowser() {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function subscribe() {
  // userAgent never changes — no-op subscriber
  return () => {};
}

interface OpenInAppBannerProps {
  slug: string | null;
}

export function OpenInAppBanner({ slug }: OpenInAppBannerProps) {
  const { t } = useClientTranslation("common");
  const isMobile = useSyncExternalStore(subscribe, getIsMobileBrowser, () => false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("openInAppDismissed") === "1";
  });

  if (!slug || !isMobile || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem("openInAppDismissed", "1");
    setDismissed(true);
  };

  const appUrl = `betarocks://crag/${slug}`;

  return (
    <div className="sticky top-0 z-50 flex items-center gap-3 bg-orange-500 text-white px-4 py-2.5">
      <Smartphone className="h-5 w-5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{t("cragPage.openInApp")}</p>
      </div>
      <a
        href={appUrl}
        className="shrink-0 rounded-full bg-white px-4 py-1 text-sm font-semibold text-orange-600 hover:bg-orange-50"
      >
        {t("cragPage.openInApp")}
      </a>
      <button
        onClick={handleDismiss}
        className="shrink-0 text-white/80 hover:text-white"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
