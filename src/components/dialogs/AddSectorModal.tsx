"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layers, Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { LatLng } from "leaflet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { useToast } from "@/hooks/use-toast";
import { CragLocationPicker } from "@/components/map/CragLocationPicker";
import { getUserProfile, type UserProfile } from "@/lib/auth/sync-key";
import { ProfileCreationModal } from "@/components/profile/ProfileCreationModal";

interface AddSectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentCrag: {
    id: string;
    name: string;
    lat: number;
    lon: number;
    country: string | null;
    state: string | null;
    municipality: string | null;
    village: string | null;
    rock_type: string | null;
  };
  onSectorCreated?: () => void;
}

export function AddSectorModal({
  open,
  onOpenChange,
  parentCrag,
  onSectorCreated,
}: AddSectorModalProps) {
  const { t } = useClientTranslation("common");
  const { toast } = useToast();
  const router = useRouter();

  // Form state - initialize position with parent crag's location
  const [position, setPosition] = useState<LatLng | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Loading states
  const [submitting, setSubmitting] = useState(false);

  // Nearby crags for duplicate detection
  const [nearbyCrags, setNearbyCrags] = useState<
    Array<{ id: string; name: string; lat: number; lon: number; slug: string; distance?: number }>
  >([]);

  // Profile creation
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Initialize position when dialog opens
  useEffect(() => {
    if (open && parentCrag.lat && parentCrag.lon) {
      // Create a LatLng-like object for initialization
      setPosition({
        lat: parentCrag.lat,
        lng: parentCrag.lon,
      } as LatLng);
    }
  }, [open, parentCrag.lat, parentCrag.lon]);

  // Check for nearby crags/sectors when position changes
  useEffect(() => {
    if (!position) {
      setNearbyCrags([]);
      return;
    }

    const checkNearby = async () => {
      try {
        const response = await fetch(
          `/api/crags/check-nearby?lat=${position.lat}&lon=${position.lng}&radius=200`
        );
        const data = await response.json();
        // Filter out the parent crag from nearby results
        const filtered = (data.nearbyCrags || []).filter(
          (crag: { id: string }) => crag.id !== parentCrag.id
        );
        setNearbyCrags(filtered);
      } catch (error) {
        console.error("Failed to check nearby crags:", error);
        setNearbyCrags([]);
      }
    };

    checkNearby();
  }, [position?.lat, position?.lng, parentCrag.id]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setPosition(null);
      setName("");
      setDescription("");
      setNearbyCrags([]);
    }
  }, [open]);

  const handleProfileCreated = (_profile: UserProfile) => {
    setShowProfileModal(false);
    // After profile creation, retry the submission
    handleSubmitWithProfile();
  };

  const handleSubmit = async () => {
    // Check for profile first
    const profile = getUserProfile();
    if (!profile) {
      setShowProfileModal(true);
      return;
    }

    await handleSubmitWithProfile();
  };

  const handleSubmitWithProfile = async () => {
    // Validation
    if (!name.trim()) {
      toast({
        title: t("addSectorModal.errors.nameRequired"),
        description: t("addSectorModal.errors.nameRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    if (!position) {
      toast({
        title: t("addSectorModal.errors.locationRequired"),
        description: t("addSectorModal.errors.locationRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/crags/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          lat: position.lat,
          lon: position.lng,
          country: parentCrag.country || "XX", // Use parent's country, fallback to XX
          state: parentCrag.state || undefined,
          municipality: parentCrag.municipality || undefined,
          village: parentCrag.village || undefined,
          rockType: parentCrag.rock_type || undefined,
          description: description.trim() || undefined,
          parentCragId: parentCrag.id, // This makes it a sector
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create sector");
      }

      // Success!
      toast({
        title: t("addSectorModal.success"),
        description: t("addSectorModal.successDesc", { name: data.crag.name }),
      });

      onOpenChange(false);

      // Notify parent to refresh sectors list
      if (onSectorCreated) {
        onSectorCreated();
      }

      // Redirect to new sector page
      router.push(`/location/${data.crag.slug}`);
    } catch (error) {
      console.error("Sector submission failed:", error);
      toast({
        title: t("addSectorModal.errors.failed"),
        description: error instanceof Error ? error.message : t("addSectorModal.errors.failedDesc"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = name.trim() && position && !submitting;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-full sm:max-w-3xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] p-0 rounded-none sm:rounded-lg left-[50%] top-0 sm:top-[50%] -translate-x-1/2 translate-y-0 sm:-translate-y-1/2">
          <ScrollArea className="h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] w-full overflow-x-hidden">
            <div className="p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-orange-500" />
                  {t("addSectorModal.title")}
                </DialogTitle>
                <DialogDescription>
                  {t("addSectorModal.subtitle", { cragName: parentCrag.name })}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 space-y-6">
                {/* Sector Name */}
                <div>
                  <Label htmlFor="sectorName">{t("addSectorModal.form.name")} *</Label>
                  <Input
                    id="sectorName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("addSectorModal.form.namePlaceholder")}
                    className="mt-1.5"
                    autoFocus
                  />
                </div>

                {/* Map Section */}
                <div>
                  <Label className="text-base font-semibold mb-2">
                    {t("addSectorModal.mapLabel")} *
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t("addSectorModal.mapHelp")}
                  </p>
                  <CragLocationPicker
                    position={position}
                    onPositionChange={setPosition}
                    loading={false}
                    nearbyCrags={nearbyCrags}
                  />
                  {position && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t("addCragModal.coordinates")}: {position.lat.toFixed(6)},{" "}
                      {position.lng.toFixed(6)}
                    </p>
                  )}

                  {/* Nearby Sectors Warning */}
                  {nearbyCrags.length > 0 && (
                    <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                            {t("addSectorModal.nearbySectorsWarning.title")}
                          </h4>
                          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                            {t("addSectorModal.nearbySectorsWarning.message", {
                              count: nearbyCrags.length,
                            })}
                          </p>
                          <div className="space-y-2">
                            {nearbyCrags.map((crag) => (
                              <div
                                key={crag.id}
                                className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-gray-900 rounded border border-yellow-200 dark:border-yellow-800"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {crag.name}
                                  </p>
                                  {crag.distance !== undefined && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {crag.distance}m {t("addCragModal.nearbyCragsWarning.away")}
                                    </p>
                                  )}
                                </div>
                                <a
                                  href={`/location/${crag.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 whitespace-nowrap"
                                >
                                  {t("addCragModal.nearbyCragsWarning.view")}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">{t("addSectorModal.form.description")}</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("addSectorModal.form.descriptionPlaceholder")}
                    className="mt-1.5 min-h-[80px]"
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{description.length} / 2000</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                    {t("addSectorModal.cancel")}
                  </Button>
                  <Button onClick={handleSubmit} disabled={!canSubmit}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("addSectorModal.submitting")}
                      </>
                    ) : (
                      <>
                        <Layers className="h-4 w-4 mr-2" />
                        {t("addSectorModal.submit")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Profile Creation Modal */}
      <ProfileCreationModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        trigger="manual"
        onCreated={handleProfileCreated}
      />
    </>
  );
}
