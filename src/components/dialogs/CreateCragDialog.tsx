"use client";

import { useState, useCallback } from "react";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SuggestedCrag {
  name: string;
  latitude: number;
  longitude: number;
  rockType?: string | null;
  climbingTypes?: string[];
  country?: string;
  state?: string;
  municipality?: string;
  village?: string;
  osmId?: string;
  osmType?: "node" | "way" | "relation";
}

interface CreateCragDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedCrag: SuggestedCrag;
  onSuccess: (cragName: string, latitude: number, longitude: number) => void;
}

const ROCK_TYPES = [
  "granite",
  "sandstone",
  "limestone",
  "basalt",
  "gneiss",
  "quartzite",
  "conglomerate",
  "volcanic",
  "dolomite",
  "unknown",
] as const;

export function CreateCragDialog({
  open,
  onOpenChange,
  suggestedCrag,
  onSuccess,
}: CreateCragDialogProps) {
  const { t } = useClientTranslation("common");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<{
    name: string;
    distance: number;
  } | null>(null);

  // Form state
  const [name, setName] = useState(suggestedCrag.name);
  const [rockType, setRockType] = useState(suggestedCrag.rockType || "unknown");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setDuplicateError(null);
      setIsSubmitting(true);

      try {
        const response = await fetch("/api/crags", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            lat: suggestedCrag.latitude,
            lon: suggestedCrag.longitude,
            rockType: rockType !== "unknown" ? rockType : null,
            climbingTypes: suggestedCrag.climbingTypes,
            country: suggestedCrag.country,
            state: suggestedCrag.state,
            municipality: suggestedCrag.municipality,
            village: suggestedCrag.village,
            osmId: suggestedCrag.osmId,
            osmType: suggestedCrag.osmType,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 409 && data.error === "duplicate") {
            // Handle duplicate error
            const nearestDuplicate = data.duplicates?.[0];
            if (nearestDuplicate) {
              setDuplicateError({
                name: nearestDuplicate.name,
                distance: nearestDuplicate.distance,
              });
            } else {
              setError(data.message || t("cragCreation.errors.duplicate"));
            }
          } else {
            setError(data.error || t("cragCreation.errors.failed"));
          }
          return;
        }

        // Success!
        onSuccess(data.crag.name, data.crag.lat, data.crag.lon);
      } catch (err) {
        console.error("[CreateCragDialog] Submit error:", err);
        setError(t("cragCreation.errors.network"));
      } finally {
        setIsSubmitting(false);
      }
    },
    [name, rockType, suggestedCrag, onSuccess, t]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("cragCreation.dialogTitle")}</DialogTitle>
            <DialogDescription>{t("cragCreation.dialogDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Error alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Duplicate warning */}
            {duplicateError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("cragCreation.errors.duplicateFound", {
                    name: duplicateError.name,
                    distance: duplicateError.distance,
                  })}
                </AlertDescription>
              </Alert>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="crag-name">{t("cragCreation.name")}</Label>
              <Input
                id="crag-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("cragCreation.namePlaceholder")}
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Rock Type */}
            <div className="space-y-2">
              <Label htmlFor="rock-type">{t("cragCreation.rockType")}</Label>
              <Select value={rockType} onValueChange={setRockType} disabled={isSubmitting}>
                <SelectTrigger id="rock-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROCK_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`rockTypes.${type}`, type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location (read-only) */}
            <div className="space-y-2">
              <Label>{t("cragCreation.location")}</Label>
              <div className="text-sm text-muted-foreground">
                {[
                  suggestedCrag.village,
                  suggestedCrag.municipality,
                  suggestedCrag.state,
                  suggestedCrag.country,
                ]
                  .filter(Boolean)
                  .join(", ") || t("cragCreation.locationUnknown")}
              </div>
            </div>

            {/* Coordinates (read-only) */}
            <div className="space-y-2">
              <Label>{t("cragCreation.coordinates")}</Label>
              <div className="text-sm text-muted-foreground font-mono">
                {suggestedCrag.latitude.toFixed(6)}, {suggestedCrag.longitude.toFixed(6)}
              </div>
            </div>

            {/* OSM Attribution */}
            {suggestedCrag.osmId && (
              <div className="text-xs text-muted-foreground">
                {t("cragCreation.osmAttribution")}{" "}
                <a
                  href={`https://www.openstreetmap.org/${suggestedCrag.osmType}/${suggestedCrag.osmId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  OSM #{suggestedCrag.osmId}
                </a>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("cragCreation.creating")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t("cragCreation.create")}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
