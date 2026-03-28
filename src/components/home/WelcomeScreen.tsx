"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloudSun, Search, Star, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { useFavorites } from "@/hooks/queries/useFavoritesQueries";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { useModifierKey } from "@/hooks/usePlatform";
import { LiveIndicator } from "@/components/ui/live-indicator";

interface WelcomeScreenProps {
  onSearchClick: () => void;
  onAboutClick: () => void;
  onPrivacyClick: () => void;
}

export function WelcomeScreen({ onSearchClick, onAboutClick, onPrivacyClick }: WelcomeScreenProps) {
  const { t } = useClientTranslation("common");
  const router = useRouter();
  const modifierKey = useModifierKey();
  const { data: favorites = [] } = useFavorites();

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      {/* Main content - centered */}
      <div className="flex-1 overflow-auto flex flex-col items-center justify-center text-center py-6 px-4">
        <div className="w-20 h-20 rounded-full bg-linear-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center mb-6">
          <CloudSun className="w-10 h-10 text-orange-500" />
        </div>
        <h2 className="text-3xl font-bold mb-3">{t("welcome.heading")}</h2>
        <p className="text-muted-foreground mb-8 max-w-md text-base">
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
            <span className="text-xs">{modifierKey === "Cmd" ? "\u2318 + " : "Ctrl + "}K</span>
          </kbd>
        </button>

        {/* View Activity Feed button */}
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="mb-6 text-sm hover:scale-105 transition-transform"
        >
          <Link href="/feed" className="inline-flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-600 dark:text-green-500" />
            <span>{t("feed.viewFeed")}</span>
            <LiveIndicator isLive={true} compact />
          </Link>
        </Button>

        {/* Favorites Quick Actions */}
        {favorites.length > 0 && (
          <div className="mt-8 w-full max-w-lg">
            <div className="flex items-center gap-2 justify-center mb-4">
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
                    favorite.latitude,
                    favorite.longitude
                  );
                return (
                  <Button
                    key={favorite.id}
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/location/${slug}`)}
                    className="transition-smooth hover:scale-105"
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

      {/* Footer */}
      <div className="border-t bg-background">
        <div className="container max-w-3xl px-4 py-4">
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
