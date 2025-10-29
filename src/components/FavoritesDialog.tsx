"use client";

import { useState } from "react";
import { Star, Trash2, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useFavorites,
  useRemoveFavorite,
  type Favorite,
} from "@/hooks/queries/useFavoritesQueries";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { getDateFnsLocale } from "@/lib/i18n/date-locales";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface FavoritesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FavoritesDialog({ open, onOpenChange }: FavoritesDialogProps) {
  const { t, i18n } = useClientTranslation("common");
  const dateLocale = getDateFnsLocale(i18n.language);
  const router = useRouter();
  const [favoriteToDelete, setFavoriteToDelete] = useState<Favorite | null>(null);

  // React Query hooks for favorites
  const { data: favorites = [], isLoading } = useFavorites();
  const removeFavorite = useRemoveFavorite();

  const handleRemove = (favorite: Favorite) => {
    setFavoriteToDelete(favorite);
  };

  const confirmDelete = () => {
    if (favoriteToDelete) {
      removeFavorite.mutate(favoriteToDelete.id);
      setFavoriteToDelete(null);
    }
  };

  const handleViewConditions = (favorite: Favorite) => {
    // Generate slug from the crag name and coordinates
    const slug = generateUniqueSlug(favorite.areaName, favorite.latitude, favorite.longitude);

    // Navigate to the crag page
    router.push(`/location/${slug}`);

    // Close the dialog
    onOpenChange(false);
  };

  const getRatingColor = (rating?: string) => {
    if (!rating) return "bg-muted";
    const normalized = rating.toLowerCase();
    if (normalized.includes("great") || normalized.includes("excellent")) return "bg-green-500";
    if (normalized.includes("good") || normalized.includes("ok")) return "bg-blue-500";
    if (normalized.includes("meh") || normalized.includes("fair")) return "bg-yellow-500";
    return "bg-orange-500";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-orange-500" />
            {t("favorites.title")}
          </DialogTitle>
          <DialogDescription>
            {favorites.length === 0
              ? t("favorites.empty")
              : t("favorites.description", { count: favorites.length })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Star className="h-16 w-16 text-muted-foreground/50 mb-4 animate-pulse" />
              <p className="text-muted-foreground">
                {t("favorites.loading") || "Loading favorites..."}
              </p>
            </div>
          ) : favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Star className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t("favorites.emptyMessage")}</p>
              <p className="text-sm text-muted-foreground mt-2">{t("favorites.emptyHint")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {favorites.map((favorite) => (
                <Card
                  key={favorite.id}
                  className="relative cursor-pointer transition-all hover:shadow-md hover:border-orange-500/50"
                  onClick={() => handleViewConditions(favorite)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {favorite.areaName}
                          {favorite.lastRating && (
                            <Badge
                              variant="outline"
                              className={`${getRatingColor(favorite.lastRating)} text-white border-none`}
                            >
                              {t(`ratings.${favorite.lastRating.toLowerCase()}`) ||
                                favorite.lastRating}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {favorite.location}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(favorite);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Rock Type */}
                    {favorite.rockType && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {t(`rockTypes.${favorite.rockType}`) || favorite.rockType}
                        </Badge>
                      </div>
                    )}

                    {/* Last Checked */}
                    {favorite.lastCheckedAt && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {t("favorites.lastChecked")}{" "}
                          {formatDistanceToNow(new Date(favorite.lastCheckedAt), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </span>
                      </div>
                    )}

                    {/* Friction Score */}
                    {favorite.lastFrictionScore !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {t("favorites.frictionScore")}:
                        </span>
                        <Badge variant="outline">{favorite.lastFrictionScore.toFixed(1)}/5</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>

      <ConfirmDialog
        open={!!favoriteToDelete}
        onOpenChange={(open) => !open && setFavoriteToDelete(null)}
        onConfirm={confirmDelete}
        title={t("favorites.confirmDelete")}
        description={t("favorites.confirmDeleteDescription", {
          name: favoriteToDelete?.areaName || "",
        })}
        confirmText={t("dialog.delete")}
        cancelText={t("dialog.cancel")}
        variant="destructive"
      />
    </Dialog>
  );
}
