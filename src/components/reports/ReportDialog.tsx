"use client";

import { useState, useEffect } from "react";
import imageCompression from "browser-image-compression";
import {
  MessageSquare,
  Loader2,
  CloudSun,
  AlertTriangle,
  Lock,
  Mountain,
  Home,
  Calendar as CalendarIcon,
  X,
  Search,
  ImagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { getUserProfile, hashSyncKeyAsync, type UserProfile } from "@/lib/auth/sync-key";
import { createReport } from "@/lib/db/queries";
import { fetchOrCreateUserProfile } from "@/lib/db/queries";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getDateFnsLocale, getLocalizedDateFormat } from "@/lib/i18n/date-locales";
import { ProfileCreationModal } from "@/components/profile/ProfileCreationModal";
import { ProfileCreatedDialog } from "@/components/profile/ProfileCreatedDialog";
import { useToast } from "@/hooks/use-toast";

type ReportCategory =
  | "conditions"
  | "safety"
  | "access"
  | "climbing_info"
  | "facilities"
  | "lost_found"
  | "other";

const categories: ReportCategory[] = [
  "conditions",
  "safety",
  "access",
  "climbing_info",
  "facilities",
  "lost_found",
  "other",
];

interface Report {
  id: string;
  category: string;
  text: string | null;
  rating_dry: number | null;
  rating_wind: number | null;
  rating_crowds: number | null;
  observed_at: string;
  expires_at: string | null;
  lost_found_type: string | null;
  author_id: string | null;
}

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cragId: string;
  cragName: string;
  onReportCreated?: () => void;
  editReport?: Report; // Optional: if provided, dialog is in edit mode
}

export function ReportDialog({
  open,
  onOpenChange,
  cragId,
  cragName,
  onReportCreated,
  editReport,
}: ReportDialogProps) {
  const { t, i18n } = useClientTranslation("common");
  const { toast } = useToast();
  const dateLocale = getDateFnsLocale(i18n.language);
  const dateFormat = getLocalizedDateFormat(i18n.language);
  const isEditMode = !!editReport;
  const [category, setCategory] = useState<ReportCategory>("conditions");
  const [dryRating, setDryRating] = useState([3]);
  const [windRating, setWindRating] = useState([3]);
  const [crowdsRating, setCrowdsRating] = useState([3]);
  const [text, setText] = useState("");
  const [lostFoundType, setLostFoundType] = useState<"lost" | "found" | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [observedAt, setObservedAt] = useState<Date>(new Date());
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProfileCreated, setShowProfileCreated] = useState(false);
  const [newSyncKey, setNewSyncKey] = useState<string>("");
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  useEffect(() => {
    if (open) {
      // Load display name from profile
      const profile = getUserProfile();
      setDisplayName(profile?.displayName || null);

      if (isEditMode && editReport) {
        // Pre-populate form with existing report data
        setCategory(editReport.category as ReportCategory);
        setDryRating([editReport.rating_dry || 3]);
        setWindRating([editReport.rating_wind || 3]);
        setCrowdsRating([editReport.rating_crowds || 3]);
        setText(editReport.text || "");
        setLostFoundType((editReport.lost_found_type as "lost" | "found") || "");
        setObservedAt(new Date(editReport.observed_at));
        setExpiresAt(editReport.expires_at ? new Date(editReport.expires_at) : undefined);
      } else {
        // Reset form for new report
        setCategory("conditions");
        setDryRating([3]);
        setWindRating([3]);
        setCrowdsRating([3]);
        setText("");
        setLostFoundType("");
        setObservedAt(new Date());
        setExpiresAt(undefined);
        setSelectedPhotos([]);
        setPhotoPreviews([]);
      }
    }
  }, [open, isEditMode, editReport]);

  // Helper to get category icon
  const getCategoryIcon = (cat: ReportCategory) => {
    const iconClass = "h-5 w-5";
    switch (cat) {
      case "conditions":
        return <CloudSun className={iconClass} />;
      case "safety":
        return <AlertTriangle className={iconClass} />;
      case "access":
        return <Lock className={iconClass} />;
      case "climbing_info":
        return <Mountain className={iconClass} />;
      case "facilities":
        return <Home className={iconClass} />;
      case "lost_found":
        return <Search className={iconClass} />;
      default:
        return <MessageSquare className={iconClass} />;
    }
  };

  const handleProfileCreated = (profile: UserProfile) => {
    setNewSyncKey(profile.syncKey);
    setShowProfileModal(false);
    setShowProfileCreated(true);
  };

  const compressPhoto = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: "image/webp",
    };
    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error("Photo compression failed:", error);
      return file; // Return original if compression fails
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files).slice(0, 3 - selectedPhotos.length); // Max 3 photos
    setSelectedPhotos((prev) => [...prev, ...newFiles]);

    // Create previews
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (profileId: string): Promise<string[]> => {
    if (selectedPhotos.length === 0) return [];

    setIsUploadingPhotos(true);
    const uploadedPaths: string[] = [];

    try {
      for (const file of selectedPhotos) {
        // Compress photo
        const compressedFile = await compressPhoto(file);

        // Generate unique filename
        const fileExt = compressedFile.name.split(".").pop() || "webp";
        const fileName = `${profileId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `reports/${fileName}`;

        // Upload to Supabase Storage
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
        );

        const { error } = await supabase.storage
          .from("report-photos")
          .upload(filePath, compressedFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) throw error;
        uploadedPaths.push(filePath);
      }

      return uploadedPaths;
    } catch (error) {
      console.error("Photo upload failed:", error);
      throw error;
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const handleSubmit = async () => {
    // Check for profile first
    const profile = getUserProfile();
    if (!profile) {
      setShowProfileModal(true);
      return;
    }

    // Validate required fields
    if (category !== "conditions" && !text.trim()) {
      toast({
        title: t("reports.detailsRequired"),
        variant: "destructive",
      });
      return;
    }

    // Validate lost_found_type is required for lost_found category
    if (category === "lost_found" && !lostFoundType) {
      toast({
        title: t("reports.lostFoundTypeRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get user profile (already validated above)
      const localProfile = getUserProfile();
      if (!localProfile) {
        throw new Error("User profile required");
      }

      // Get or create user profile in database
      const syncKeyHash = await hashSyncKeyAsync(localProfile.syncKey);
      const dbProfile = await fetchOrCreateUserProfile(syncKeyHash);

      // Upload photos if any
      let photoPaths: string[] = [];
      if (selectedPhotos.length > 0) {
        try {
          photoPaths = await uploadPhotos(dbProfile.id);
        } catch (error) {
          toast({
            title: t("reports.photoUploadFailed"),
            description: "Your report will be saved without photos.",
            variant: "destructive",
          });
          // Continue without photos
        }
      }

      if (isEditMode && editReport) {
        // Verify ownership before attempting update
        if (editReport.author_id && editReport.author_id !== dbProfile.id) {
          console.error("[ReportDialog] Author ID mismatch:", {
            reportAuthorId: editReport.author_id,
            currentUserId: dbProfile.id,
          });
          toast({
            title: t("reports.updateFailed"),
            description: "You can only edit your own reports.",
            variant: "destructive",
          });
          return;
        }

        // Update existing report
        const response = await fetch(`/api/reports/${editReport.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userProfileId: dbProfile.id,
            category: category,
            rating_dry: category === "conditions" ? dryRating[0] : null,
            rating_wind: category === "conditions" ? windRating[0] : null,
            rating_crowds: category === "conditions" ? crowdsRating[0] : null,
            text: text.trim() || null,
            ...(category === "lost_found" && { lost_found_type: lostFoundType }),
            observed_at: observedAt.toISOString(),
            expires_at: expiresAt ? expiresAt.toISOString() : null,
            photos: photoPaths,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[ReportDialog] Update failed:", errorData);
          throw new Error(errorData.error || "Failed to update report");
        }

        // Show success toast
        toast({
          title: t("reports.reportUpdated"),
          description: t("reports.reportUpdatedDescription"),
        });
      } else {
        // Create new report
        await createReport({
          crag_id: cragId,
          author_id: dbProfile.id,
          category: category,
          rating_dry: category === "conditions" ? dryRating[0] : null,
          rating_wind: category === "conditions" ? windRating[0] : null,
          rating_crowds: category === "conditions" ? crowdsRating[0] : null,
          text: text.trim() || null,
          ...(category === "lost_found" && { lost_found_type: lostFoundType }),
          observed_at: observedAt.toISOString(),
          expires_at: expiresAt ? expiresAt.toISOString() : null,
          photos: photoPaths,
        });

        // Show success toast
        toast({
          title: t("reports.reportCreated"),
          description: t("reports.reportCreatedDescription"),
        });
      }

      // Success! Close dialog and refresh
      onOpenChange(false);
      if (onReportCreated) {
        onReportCreated();
      }
    } catch (error) {
      console.error("Failed to submit report:", error);
      toast({
        title: isEditMode ? t("reports.updateFailed") : t("reports.submitFailed"),
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {isEditMode ? t("reports.editReport") : t("reports.addReport")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("reports.editReportDescription")
              : t("reports.addReportDescription", { cragName })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-6">
          <div className="space-y-4 pb-2 px-1">
            {/* Author Preview */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                {t("reports.postingAs")}:{" "}
                <span className="font-medium text-foreground">
                  {displayName || t("profile.anonymous")}
                </span>
              </p>
            </div>

            {/* Observation Date */}
            <div className="mb-6">
              <Label className="text-sm font-medium block mb-1">
                {t("reports.observationDate")}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-11 px-4 bg-background hover:bg-orange-50 dark:hover:bg-orange-900/10 border-2 transition-colors",
                      !observedAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-3 h-4 w-4 text-orange-500" />
                    <div className="flex flex-col items-start">
                      {observedAt ? (
                        <>
                          <span className="text-sm font-medium">
                            {format(observedAt, dateFormat, { locale: dateLocale })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {(() => {
                              const today = new Date();
                              const yesterday = new Date(today);
                              yesterday.setDate(yesterday.getDate() - 1);

                              if (
                                format(observedAt, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")
                              ) {
                                return t("time.today");
                              } else if (
                                format(observedAt, "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd")
                              ) {
                                return t("time.yesterday");
                              } else {
                                const daysAgo = Math.floor(
                                  (today.getTime() - observedAt.getTime()) / (1000 * 60 * 60 * 24)
                                );
                                return t("time.daysAgo", { count: daysAgo });
                              }
                            })()}
                          </span>
                        </>
                      ) : (
                        <span>{t("time.pickDate")}</span>
                      )}
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <div className="p-3 border-b">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setObservedAt(new Date())}
                      >
                        {t("time.today")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const yesterday = new Date();
                          yesterday.setDate(yesterday.getDate() - 1);
                          setObservedAt(yesterday);
                        }}
                      >
                        {t("time.yesterday")}
                      </Button>
                    </div>
                  </div>
                  <Calendar
                    mode="single"
                    selected={observedAt}
                    onSelect={(date) => {
                      if (!date) return;
                      // Preserve the current time component when selecting a new date
                      const newDate = new Date(date);
                      newDate.setHours(observedAt.getHours());
                      newDate.setMinutes(observedAt.getMinutes());
                      newDate.setSeconds(observedAt.getSeconds());
                      setObservedAt(newDate);
                    }}
                    disabled={(date) => {
                      const sevenDaysAgo = new Date();
                      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      return date < sevenDaysAgo || date > tomorrow;
                    }}
                    locale={dateLocale}
                    weekStartsOn={i18n.language === "en" || i18n.language.startsWith("en-") ? 0 : 1}
                    autoFocus
                    className="rounded-md"
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />
                {t("reports.observationDateHelp")}
              </p>
            </div>

            {/* Category Selection */}
            <div>
              <Label className="block mb-2">{t("reports.category")}</Label>
              <div className="grid grid-cols-2 gap-2.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      category === cat
                        ? "border-orange-500 bg-orange-500/10 text-orange-600"
                        : "border-border hover:border-orange-300 hover:bg-muted/50"
                    }`}
                  >
                    {getCategoryIcon(cat)}
                    <span className="text-sm font-medium">{t(`reports.categories.${cat}`)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Lost/Found Type Selection - Only for "lost_found" category */}
            {category === "lost_found" && (
              <div>
                <Label className="block mb-2">
                  {t("reports.lostFoundType")} <span className="text-destructive">*</span>
                </Label>
                <RadioGroup
                  value={lostFoundType}
                  onValueChange={(value) => setLostFoundType(value as "lost" | "found")}
                  className="grid grid-cols-2 gap-2.5"
                >
                  <div>
                    <RadioGroupItem value="lost" id="lost" className="peer sr-only" />
                    <Label
                      htmlFor="lost"
                      className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all peer-data-[state=checked]:border-orange-500 peer-data-[state=checked]:bg-orange-500/10 peer-data-[state=checked]:text-orange-600 hover:border-orange-300 hover:bg-muted/50"
                    >
                      <Search className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        {t("reports.lostFoundTypes.lost")}
                      </span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="found" id="found" className="peer sr-only" />
                    <Label
                      htmlFor="found"
                      className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all peer-data-[state=checked]:border-orange-500 peer-data-[state=checked]:bg-orange-500/10 peer-data-[state=checked]:text-orange-600 hover:border-orange-300 hover:bg-muted/50"
                    >
                      <Search className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        {t("reports.lostFoundTypes.found")}
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />
                  {t("reports.categoryHelp.lost_found")}
                </p>
              </div>
            )}

            {/* Condition Ratings - Only for "conditions" category */}
            {category === "conditions" && (
              <div className="my-6 space-y-1">
                {/* Dryness Rating */}
                <div>
                  <Label className="block mb-2">{t("reports.dryness")}</Label>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>{t("reports.scales.veryWet")}</span>
                    <span>{t("reports.scales.veryDry")}</span>
                  </div>
                  <Slider
                    value={dryRating}
                    onValueChange={setDryRating}
                    min={1}
                    max={5}
                    step={1}
                    className="cursor-pointer"
                  />
                  <div className="text-center pt-1">
                    <span className="text-xl font-bold text-orange-500">{dryRating[0]}/5</span>
                  </div>
                </div>

                {/* Wind Rating */}
                <div>
                  <Label className="block mb-2">{t("reports.wind")}</Label>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>{t("reports.scales.veryWindy")}</span>
                    <span>{t("reports.scales.calm")}</span>
                  </div>
                  <Slider
                    value={windRating}
                    onValueChange={setWindRating}
                    min={1}
                    max={5}
                    step={1}
                    className="cursor-pointer"
                  />
                  <div className="text-center pt-1">
                    <span className="text-xl font-bold text-orange-500">{windRating[0]}/5</span>
                  </div>
                </div>

                {/* Crowds Rating */}
                <div>
                  <Label className="block mb-2">{t("reports.crowds")}</Label>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>{t("reports.scales.veryCrowded")}</span>
                    <span>{t("reports.scales.empty")}</span>
                  </div>
                  <Slider
                    value={crowdsRating}
                    onValueChange={setCrowdsRating}
                    min={1}
                    max={5}
                    step={1}
                    className="cursor-pointer"
                  />
                  <div className="text-center pt-1">
                    <span className="text-xl font-bold text-orange-500">{crowdsRating[0]}/5</span>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Comments */}
            <div>
              <Label htmlFor="report-text" className="block mb-2">
                {category === "conditions" ? t("reports.additionalComments") : t("reports.details")}
                {category !== "conditions" && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Textarea
                id="report-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t(`reports.placeholders.${category}`)}
                rows={category === "conditions" ? 4 : 6}
                maxLength={500}
                required={category !== "conditions"}
              />
              <p className="text-xs text-muted-foreground text-right">{text.length}/500</p>
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t("reports.photos")} ({selectedPhotos.length}/3)
              </Label>
              <div className="flex flex-wrap gap-3">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="h-24 w-24 object-cover rounded-lg border-2 border-border"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {selectedPhotos.length < 3 && (
                  <label className="h-24 w-24 flex items-center justify-center border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t("reports.photoHint")}</p>
            </div>

            {/* Expiry Date - Show for all categories except "conditions" */}
            {category !== "conditions" && (
              <div className="mb-6">
                <Label className="text-sm font-medium block mb-1">{t("reports.expiresAt")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-11 px-4 bg-background hover:bg-orange-50 dark:hover:bg-orange-900/10 border-2 transition-colors",
                        !expiresAt && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-3 h-4 w-4 text-orange-500" />
                      {expiresAt ? (
                        format(expiresAt, dateFormat, { locale: dateLocale })
                      ) : (
                        <span>{t("reports.noExpiry")}</span>
                      )}
                      {expiresAt && (
                        <X
                          className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpiresAt(undefined);
                          }}
                        />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={expiresAt}
                      onSelect={(date) => {
                        if (!date) return;
                        setExpiresAt(date);
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                      locale={dateLocale}
                      weekStartsOn={
                        i18n.language === "en" || i18n.language.startsWith("en-") ? 0 : 1
                      }
                      autoFocus
                      className="rounded-md"
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />
                  {t("reports.expiresAtHelp")}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                {t("dialog.cancel")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || isUploadingPhotos}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {isSubmitting || isUploadingPhotos ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUploadingPhotos ? t("reports.uploadingPhotos") : t("reports.submitting")}
                  </>
                ) : isEditMode ? (
                  t("reports.updateReport")
                ) : (
                  t("reports.submitReport")
                )}
              </Button>
            </div>
          </div>
        </ScrollArea>

        {/* Profile Creation Modal */}
        <ProfileCreationModal
          open={showProfileModal}
          onOpenChange={setShowProfileModal}
          trigger="report"
          onCreated={handleProfileCreated}
        />

        {/* Profile Created Dialog */}
        <ProfileCreatedDialog
          open={showProfileCreated}
          onOpenChange={(open) => {
            setShowProfileCreated(open);
            // When closed, automatically retry the report submission
            if (!open && newSyncKey) {
              handleSubmit();
            }
          }}
          syncKey={newSyncKey}
          completedAction={t("reports.readyToPost")}
        />
      </DialogContent>
    </Dialog>
  );
}
