"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mountain, Loader2, Check, AlertTriangle, ExternalLink } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { useToast } from "@/hooks/use-toast";
import { CragLocationPicker } from "@/components/map/CragLocationPicker";
import { getAllCountryCodes, getCountryName, getCountryFlag } from "@/lib/utils/countries-client";
import { getUserProfile, type UserProfile } from "@/lib/auth/sync-key";
import { ProfileCreationModal } from "@/components/profile/ProfileCreationModal";

interface AddCragModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
}

const ROCK_TYPES = [
  "granite",
  "sandstone",
  "limestone",
  "gneiss",
  "quartzite",
  "gritstone",
  "basalt",
  "volcanic",
  "conglomerate",
  "schist",
  "slate",
  "other",
];

const CLIMBING_TYPES = ["sport", "trad", "boulder", "mixed", "aid", "ice"];

const ASPECTS = [
  { value: 0, label: "N" },
  { value: 45, label: "NE" },
  { value: 90, label: "E" },
  { value: 135, label: "SE" },
  { value: 180, label: "S" },
  { value: 225, label: "SW" },
  { value: 270, label: "W" },
  { value: 315, label: "NW" },
];

// Use the complete list of all 249 countries from i18n-iso-countries
// This is dynamically loaded and includes every ISO 3166-1 alpha-2 country
const COUNTRIES = getAllCountryCodes();

export function AddCragModal({ open, onOpenChange, initialName }: AddCragModalProps) {
  const { t } = useClientTranslation("common");
  const { toast } = useToast();
  const router = useRouter();

  // Form state
  const [position, setPosition] = useState<LatLng | null>(null);
  const [name, setName] = useState(initialName || "");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [village, setVillage] = useState("");
  const [rockType, setRockType] = useState("");
  const [selectedAspects, setSelectedAspects] = useState<number[]>([]);
  const [selectedClimbingTypes, setSelectedClimbingTypes] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  // Loading states
  const [geocoding, setGeocoding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Nearby crags for duplicate detection
  const [nearbyCrags, setNearbyCrags] = useState<
    Array<{ id: string; name: string; lat: number; lon: number; slug: string; distance?: number }>
  >([]);

  // Profile creation
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Check for nearby crags when position changes
  useEffect(() => {
    if (!position) {
      setNearbyCrags([]);
      return;
    }

    const checkNearby = async () => {
      try {
        const response = await fetch(
          `/api/crags/check-nearby?lat=${position.lat}&lon=${position.lng}&radius=500`
        );
        const data = await response.json();
        setNearbyCrags(data.nearbyCrags || []);
      } catch (error) {
        console.error("Failed to check nearby crags:", error);
        setNearbyCrags([]);
      }
    };

    checkNearby();
  }, [position?.lat, position?.lng]);

  // Auto-fill fields when map position changes
  useEffect(() => {
    if (!position) return;

    const fetchGeocode = async () => {
      setGeocoding(true);
      try {
        const response = await fetch(
          `/api/geocode/reverse?lat=${position.lat}&lon=${position.lng}`
        );
        const data = await response.json();

        if (data.success && data.data.formatted) {
          const { formatted } = data.data;
          // Auto-fill fields if they're empty
          if (!name || name === initialName) {
            setName(formatted.suggestedName || initialName || "");
          }
          if (!country) setCountry(formatted.country);
          if (!state) setState(formatted.state);
          if (!municipality) setMunicipality(formatted.municipality);
          if (!village) setVillage(formatted.village);
        }
      } catch (error) {
        console.error("Geocoding failed:", error);
      } finally {
        setGeocoding(false);
      }
    };

    fetchGeocode();
  }, [position?.lat, position?.lng]); // Only depend on coordinates

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setPosition(null);
      setName(initialName || "");
      setCountry("");
      setState("");
      setMunicipality("");
      setVillage("");
      setRockType("");
      setSelectedAspects([]);
      setSelectedClimbingTypes([]);
      setDescription("");
      setNearbyCrags([]);
    }
  }, [open, initialName]);

  const toggleAspect = (aspect: number) => {
    setSelectedAspects((prev) =>
      prev.includes(aspect) ? prev.filter((a) => a !== aspect) : [...prev, aspect]
    );
  };

  const toggleClimbingType = (type: string) => {
    setSelectedClimbingTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

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
        title: t("addCragModal.errors.nameRequired"),
        description: t("addCragModal.errors.nameRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    if (!position) {
      toast({
        title: t("addCragModal.errors.locationRequired"),
        description: t("addCragModal.errors.locationRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    if (!country) {
      toast({
        title: t("addCragModal.errors.countryRequired"),
        description: t("addCragModal.errors.countryRequiredDesc"),
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
          country: country,
          state: state || undefined,
          municipality: municipality || undefined,
          village: village || undefined,
          rockType: rockType || undefined,
          aspects: selectedAspects.length > 0 ? selectedAspects : undefined,
          climbingTypes: selectedClimbingTypes.length > 0 ? selectedClimbingTypes : undefined,
          description: description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create crag");
      }

      // Success!
      toast({
        title: t("addCragModal.success"),
        description: t("addCragModal.successDesc", { name: data.crag.name }),
      });

      onOpenChange(false);

      // Redirect to new crag page
      router.push(`/location/${data.crag.slug}`);
    } catch (error) {
      console.error("Crag submission failed:", error);
      toast({
        title: t("addCragModal.errors.failed"),
        description: error instanceof Error ? error.message : t("addCragModal.errors.failedDesc"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = name.trim() && position && country && !submitting && !geocoding;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-full sm:max-w-4xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] m-0 sm:m-4 p-0 rounded-none sm:rounded-lg">
          <ScrollArea className="h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh]">
            <div className="p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mountain className="h-5 w-5 text-orange-500" />
                  {t("addCragModal.title")}
                </DialogTitle>
                <DialogDescription>{t("addCragModal.subtitle")}</DialogDescription>
              </DialogHeader>

              <div className="mt-6 space-y-6">
                {/* Map Section */}
                <div>
                  <Label className="text-base font-semibold mb-2">
                    {t("addCragModal.mapLabel")} *
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">{t("addCragModal.mapHelp")}</p>
                  <CragLocationPicker
                    position={position}
                    onPositionChange={setPosition}
                    loading={geocoding}
                    nearbyCrags={nearbyCrags}
                  />
                  {position && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t("addCragModal.coordinates")}: {position.lat.toFixed(6)},{" "}
                      {position.lng.toFixed(6)}
                    </p>
                  )}

                  {/* Nearby Crags Warning */}
                  {nearbyCrags.length > 0 && (
                    <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                            {t("addCragModal.nearbyCragsWarning.title")}
                          </h4>
                          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                            {t("addCragModal.nearbyCragsWarning.message", {
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
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-3">
                            {t("addCragModal.nearbyCragsWarning.proceed")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">{t("addCragModal.form.name")} *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("addCragModal.form.namePlaceholder")}
                      className="mt-1.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="country">{t("addCragModal.form.country")} *</Label>
                      <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder={t("addCragModal.form.countryPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((code) => (
                            <SelectItem key={code} value={code}>
                              {getCountryFlag(code)} {getCountryName(code)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="state">{t("addCragModal.form.state")}</Label>
                      <Input
                        id="state"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder={t("addCragModal.form.statePlaceholder")}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="municipality">{t("addCragModal.form.municipality")}</Label>
                      <Input
                        id="municipality"
                        value={municipality}
                        onChange={(e) => setMunicipality(e.target.value)}
                        placeholder={t("addCragModal.form.municipalityPlaceholder")}
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="village">{t("addCragModal.form.village")}</Label>
                      <Input
                        id="village"
                        value={village}
                        onChange={(e) => setVillage(e.target.value)}
                        placeholder={t("addCragModal.form.villagePlaceholder")}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Climbing Details */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="rockType">{t("addCragModal.form.rockType")}</Label>
                    <Select value={rockType} onValueChange={setRockType}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder={t("addCragModal.form.rockTypePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {ROCK_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {t(`addCragModal.rockTypes.${type}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{t("addCragModal.form.aspects")}</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      {t("addCragModal.form.aspectsHelp")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ASPECTS.map((aspect) => (
                        <Badge
                          key={aspect.value}
                          variant={selectedAspects.includes(aspect.value) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleAspect(aspect.value)}
                        >
                          {selectedAspects.includes(aspect.value) && (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          {aspect.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>{t("addCragModal.form.climbingTypes")}</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      {t("addCragModal.form.climbingTypesHelp")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {CLIMBING_TYPES.map((type) => (
                        <Badge
                          key={type}
                          variant={selectedClimbingTypes.includes(type) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleClimbingType(type)}
                        >
                          {selectedClimbingTypes.includes(type) && (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          {t(`addCragModal.climbingTypes.${type}`)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">{t("addCragModal.form.description")}</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t("addCragModal.form.descriptionPlaceholder")}
                      className="mt-1.5 min-h-[100px]"
                      maxLength={5000}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {description.length} / 5000
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={submitting}
                  >
                    {t("addCragModal.cancel")}
                  </Button>
                  <Button onClick={handleSubmit} disabled={!canSubmit}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("addCragModal.submitting")}
                      </>
                    ) : (
                      <>
                        <Mountain className="h-4 w-4 mr-2" />
                        {t("addCragModal.submit")}
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
