"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  Loader2,
  CloudSun,
  AlertTriangle,
  Lock,
  Mountain,
  Home,
  Calendar as CalendarIcon,
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
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { getUserProfile, initializeUserProfile, hashSyncKeyAsync } from "@/lib/auth/sync-key";
import { createReport } from "@/lib/db/queries";
import { fetchOrCreateUserProfile } from "@/lib/db/queries";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type ReportCategory = "conditions" | "safety" | "access" | "beta" | "facilities" | "other";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cragId: string;
  cragName: string;
  onReportCreated?: () => void;
}

export function ReportDialog({
  open,
  onOpenChange,
  cragId,
  cragName,
  onReportCreated,
}: ReportDialogProps) {
  const { t } = useClientTranslation("common");
  const [category, setCategory] = useState<ReportCategory>("conditions");
  const [dryRating, setDryRating] = useState([3]);
  const [windRating, setWindRating] = useState([3]);
  const [crowdsRating, setCrowdsRating] = useState([3]);
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [observedAt, setObservedAt] = useState<Date>(new Date());

  useEffect(() => {
    if (open) {
      // Load display name from profile
      const profile = getUserProfile();
      setDisplayName(profile?.displayName || null);
      // Reset form
      setCategory("conditions");
      setDryRating([3]);
      setWindRating([3]);
      setCrowdsRating([3]);
      setText("");
      setObservedAt(new Date());
    }
  }, [open]);

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
      case "beta":
        return <Mountain className={iconClass} />;
      case "facilities":
        return <Home className={iconClass} />;
      default:
        return <MessageSquare className={iconClass} />;
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (category !== "conditions" && !text.trim()) {
      alert(t("reports.detailsRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      // Initialize or get user profile
      const localProfile = await initializeUserProfile();

      // Get or create user profile in database
      const syncKeyHash = await hashSyncKeyAsync(localProfile.syncKey);
      const dbProfile = await fetchOrCreateUserProfile(syncKeyHash);

      // Create report
      await createReport({
        crag_id: cragId,
        author_id: dbProfile.id,
        category: category,
        rating_dry: category === "conditions" ? dryRating[0] : null,
        rating_wind: category === "conditions" ? windRating[0] : null,
        rating_crowds: category === "conditions" ? crowdsRating[0] : null,
        text: text.trim() || null,
        observed_at: observedAt.toISOString(),
      });

      // Success!
      onOpenChange(false);
      if (onReportCreated) {
        onReportCreated();
      }
    } catch (error) {
      console.error("Failed to submit report:", error);
      alert("Failed to submit report. Please try again.");
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
            {t("reports.addReport")}
          </DialogTitle>
          <DialogDescription>{t("reports.addReportDescription", { cragName })}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-3 py-4">
            {/* Author Preview */}
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                {t("reports.postingAs")}:{" "}
                <span className="font-medium text-foreground">
                  {displayName || t("profile.anonymous")}
                </span>
              </p>
            </div>

            {/* Observation Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("reports.observationDate")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-11 px-4 bg-background hover:bg-accent hover:text-accent-foreground border-2 transition-colors",
                      !observedAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-3 h-4 w-4 text-orange-500" />
                    <div className="flex flex-col items-start">
                      {observedAt ? (
                        <>
                          <span className="text-sm font-medium">
                            {format(observedAt, "EEEE, MMMM d, yyyy")}
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
                                return `${daysAgo} days ago`;
                              }
                            })()}
                          </span>
                        </>
                      ) : (
                        <span>Pick a date</span>
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
                    onSelect={(date) => date && setObservedAt(date)}
                    disabled={(date) => {
                      const sevenDaysAgo = new Date();
                      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      return date < sevenDaysAgo || date > tomorrow;
                    }}
                    initialFocus
                    className="rounded-md"
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />
                {t("reports.observationDateHelp")}
              </p>
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <Label>{t("reports.category")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    "conditions",
                    "safety",
                    "access",
                    "beta",
                    "facilities",
                    "other",
                  ] as ReportCategory[]
                ).map((cat) => (
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
              <p className="text-xs text-muted-foreground">
                {t(`reports.categoryDescriptions.${category}`)}
              </p>
            </div>

            {/* Condition Ratings - Only for "conditions" category */}
            {category === "conditions" && (
              <>
                {/* Dryness Rating */}
                <div className="space-y-1">
                  <Label>{t("reports.dryness")}</Label>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
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
                <div className="space-y-1">
                  <Label>{t("reports.wind")}</Label>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
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
                <div className="space-y-1">
                  <Label>{t("reports.crowds")}</Label>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
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
              </>
            )}

            {/* Additional Comments */}
            <div className="space-y-2">
              <Label htmlFor="report-text">
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

            {/* Submit Button */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                {t("dialog.cancel")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("reports.submitting")}
                  </>
                ) : (
                  t("reports.submit")
                )}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
