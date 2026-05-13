"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloudSun, Search, Star, Activity, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { useFavorites } from "@/hooks/queries/useFavoritesQueries";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { useModifierKey } from "@/hooks/usePlatform";
import { LiveIndicator } from "@/components/ui/live-indicator";
import { cn } from "@/lib/utils";
import type { GeoStatus, NearbyState } from "@/components/home/home-map-types";
import { NearbyCragsControl } from "@/components/home/NearbyCragsControl";

interface WelcomeScreenProps {
  onSearchClick: () => void;
  onAboutClick: () => void;
  onPrivacyClick: () => void;
  onLocateClick: () => void;
  onOpenMap: () => void;
  geoStatus: GeoStatus;
  nearbyState: NearbyState;
  hiddenLabels: ReadonlySet<string>;
  onToggleLabel: (key: string) => void;
}

export function WelcomeScreen({
  onSearchClick,
  onAboutClick,
  onPrivacyClick,
  onLocateClick,
  onOpenMap,
  geoStatus,
  nearbyState,
  hiddenLabels,
  onToggleLabel,
}: WelcomeScreenProps) {
  const { t } = useClientTranslation("common");
  const router = useRouter();
  const modifierKey = useModifierKey();
  const { data: favorites = [] } = useFavorites();
  // Once the user has shared their location, slide the card to the left edge so the
  // nearby-crag markers in the centre of the map are visible.
  const slideLeft = geoStatus === "ready";

  return (
    <div className="flex flex-col h-full">
      {/* Hero — floats over the map; map stays interactive around it */}
      <div className="flex-1 flex flex-col items-center px-3 sm:px-4 pt-4 sm:pt-8 overflow-hidden">
        <div
          className={cn(
            "pointer-events-auto w-full max-w-lg max-h-full overflow-y-auto rounded-3xl border bg-background/75 dark:bg-background/65 backdrop-blur-2xl shadow-2xl px-5 py-7 sm:px-8 sm:py-8 text-center transition-transform duration-500 ease-out",
            // When active, slide left so the card's left edge lines up with the navbar's
            // container edge (the logo). Constants: 16rem = ½ card (max-w-lg), 1rem = container
            // px-4, 43.75rem = ½ of the 1400px container max-width.
            slideLeft && "sm:translate-x-[max(calc(17rem_-_50vw),-26.75rem)]"
          )}
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full bg-linear-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center mb-4 sm:mb-5">
            <CloudSun className="w-7 h-7 sm:w-8 sm:h-8 text-orange-500" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">{t("welcome.heading")}</h2>
          <p className="text-muted-foreground mb-5 sm:mb-6 max-w-md mx-auto text-sm sm:text-base">
            {t("welcome.description")}
          </p>

          {/* Search hint - clickable */}
          <button
            onClick={onSearchClick}
            className="inline-flex items-center gap-2 mb-3 text-sm text-muted-foreground bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-800/30 rounded-lg px-3 py-2 hover:bg-orange-100/50 dark:hover:bg-orange-900/30 hover:border-orange-300/50 dark:hover:border-orange-700/50 transition-colors cursor-pointer"
          >
            <Search className="h-4 w-4 text-orange-600 dark:text-orange-500 shrink-0" />
            <span>{t("welcome.searchHint")}</span>
            <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">{modifierKey === "Cmd" ? "⌘ + " : "Ctrl + "}K</span>
            </kbd>
          </button>

          {/* Crags near me — desktop only (map filters/count tied to the visible map) */}
          <div className="hidden sm:flex justify-center mb-3">
            <NearbyCragsControl
              geoStatus={geoStatus}
              nearbyState={nearbyState}
              onLocateClick={onLocateClick}
              hiddenLabels={hiddenLabels}
              onToggleLabel={onToggleLabel}
            />
          </div>

          {/* View map — mobile only (the map lives on its own screen on small viewports) */}
          <div className="flex sm:hidden justify-center mb-3">
            <button
              onClick={onOpenMap}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border bg-orange-50/70 dark:bg-orange-950/30 border-orange-200/60 dark:border-orange-800/40 hover:bg-orange-100/70 dark:hover:bg-orange-900/40 cursor-pointer transition-colors"
            >
              <MapIcon className="h-4 w-4 text-orange-500 shrink-0" />
              <span>{t("welcome.map.openMap", "Browse crags on map")}</span>
            </button>
          </div>

          {/* View Activity Feed button */}
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="mb-2 text-sm hover:scale-105 transition-transform"
          >
            <Link href="/feed" className="inline-flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-600 dark:text-green-500" />
              <span>{t("feed.viewFeed")}</span>
              <LiveIndicator isLive={true} compact />
            </Link>
          </Button>

          {/* Favorites Quick Actions */}
          {favorites.length > 0 && (
            <div className="mt-6 w-full">
              <div className="flex items-center gap-2 justify-center mb-3">
                <Star className="h-4 w-4 text-orange-500" />
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t("welcome.yourFavorites")}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {favorites.slice(0, 6).map((favorite) => {
                  const slug =
                    favorite.areaSlug ||
                    generateUniqueSlug(
                      favorite.areaName,
                      favorite.latitude ?? 0,
                      favorite.longitude ?? 0
                    );
                  return (
                    <Button
                      key={favorite.id}
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/location/${slug}`)}
                      className="transition-smooth hover:scale-105 bg-background/60"
                    >
                      <Star className="h-3 w-3 mr-1.5 fill-orange-500 text-orange-500" />
                      {favorite.areaName}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pointer-events-auto border-t bg-background/85 backdrop-blur-md">
        <div className="container max-w-3xl px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            <a
              href="https://apps.apple.com/us/app/beta-rocks/id6760671893"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <img
                src="/download-on-app-store.svg"
                alt="Download on the App Store"
                className="h-8"
              />
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=rocks.beta.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <img
                src="/google-play-badge.png"
                alt="Get it on Google Play"
                className="h-8"
              />
            </a>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
            <button
              onClick={onAboutClick}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              {t("footer.about")}
            </button>
            <span>•</span>
            <button
              onClick={onPrivacyClick}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              {t("footer.privacy")}
            </button>
            <span>•</span>
            <a
              href="https://github.com/rbatsenko/beta-rocks"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              {t("footer.github")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
