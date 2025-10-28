"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
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
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { getUserProfile, initializeUserProfile, hashSyncKeyAsync } from "@/lib/auth/sync-key";
import { createReport } from "@/lib/db/queries";
import { fetchOrCreateUserProfile } from "@/lib/db/queries";

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
  const [dryRating, setDryRating] = useState([3]);
  const [windRating, setWindRating] = useState([3]);
  const [crowdsRating, setCrowdsRating] = useState([3]);
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Load display name from profile
      const profile = getUserProfile();
      setDisplayName(profile?.displayName || null);
      // Reset form
      setDryRating([3]);
      setWindRating([3]);
      setCrowdsRating([3]);
      setText("");
    }
  }, [open]);

  const handleSubmit = async () => {
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
        rating_dry: dryRating[0],
        rating_wind: windRating[0],
        rating_crowds: crowdsRating[0],
        text: text.trim() || null,
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

  const getRatingLabel = (value: number) => {
    if (value === 1) return t("reports.ratings.veryPoor");
    if (value === 2) return t("reports.ratings.poor");
    if (value === 3) return t("reports.ratings.okay");
    if (value === 4) return t("reports.ratings.good");
    if (value === 5) return t("reports.ratings.excellent");
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t("reports.addReport")}
          </DialogTitle>
          <DialogDescription>{t("reports.addReportDescription", { cragName })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Author Preview */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              {t("reports.postingAs")}:{" "}
              <span className="font-medium text-foreground">
                {displayName || t("profile.anonymous")}
              </span>
            </p>
          </div>

          {/* Dryness Rating */}
          <div className="space-y-2">
            <Label>{t("reports.dryness")}</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={dryRating}
                onValueChange={setDryRating}
                min={1}
                max={5}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-medium w-20 text-right">
                {getRatingLabel(dryRating[0])}
              </span>
            </div>
          </div>

          {/* Wind Rating */}
          <div className="space-y-2">
            <Label>{t("reports.wind")}</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={windRating}
                onValueChange={setWindRating}
                min={1}
                max={5}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-medium w-20 text-right">
                {getRatingLabel(windRating[0])}
              </span>
            </div>
          </div>

          {/* Crowds Rating */}
          <div className="space-y-2">
            <Label>{t("reports.crowds")}</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={crowdsRating}
                onValueChange={setCrowdsRating}
                min={1}
                max={5}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-medium w-20 text-right">
                {getRatingLabel(crowdsRating[0])}
              </span>
            </div>
          </div>

          {/* Additional Comments */}
          <div className="space-y-2">
            <Label htmlFor="report-text">{t("reports.additionalComments")}</Label>
            <Textarea
              id="report-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("reports.commentsPlaceholder")}
              rows={4}
              maxLength={500}
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("reports.submitting")}
                </>
              ) : (
                t("reports.submit")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
