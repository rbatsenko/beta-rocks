"use client";

import { useState } from "react";
import { Star, Trash2, MapPin } from "lucide-react";
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
import { useRouter } from "next/navigation";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface FavoritesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FavoritesDialog({ open, onOpenChange }: FavoritesDialogProps) {
  const { t } = useClientTranslation("common");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]" onOpenAutoFocus={(e) => e.preventDefault()}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((favorite) => (
                <Card
                  key={favorite.id}
                  className="relative cursor-pointer transition-all hover:shadow-md hover:border-orange-500/50"
                  onClick={() => handleViewConditions(favorite)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{favorite.areaName}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1 text-xs">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{favorite.location}</span>
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(favorite);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  {favorite.rockType && (
                    <CardContent className="pt-0">
                      <Badge variant="secondary" className="text-xs">
                        {t(`rockTypes.${favorite.rockType}`) || favorite.rockType}
                      </Badge>
                    </CardContent>
                  )}
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
