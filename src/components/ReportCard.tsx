"use client";

import { useState } from "react";
import { ThumbsUp, User, Wind, Droplets, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { formatDistanceToNow } from "date-fns";
import { hashSyncKeyAsync } from "@/lib/auth/sync-key";
import { createConfirmation, hasUserConfirmedReport } from "@/lib/db/queries";
import { getUserProfile } from "@/lib/auth/sync-key";

interface Report {
  id: string;
  text: string | null;
  rating_dry: number | null;
  rating_wind: number | null;
  rating_crowds: number | null;
  created_at: string;
  author?: {
    id: string;
    display_name: string | null;
  } | null;
  confirmations?: { count: number }[] | null;
}

interface ReportCardProps {
  report: Report;
  onConfirmationChange?: () => void;
}

export function ReportCard({ report, onConfirmationChange }: ReportCardProps) {
  const { t } = useClientTranslation("common");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmationCount, setConfirmationCount] = useState(
    report.confirmations?.length || 0
  );

  // Check if user has already confirmed this report
  useState(() => {
    const checkConfirmation = async () => {
      const profile = getUserProfile();
      if (!profile?.syncKey) return;

      const syncKeyHash = await hashSyncKeyAsync(profile.syncKey);
      const confirmed = await hasUserConfirmedReport(report.id, syncKeyHash);
      setIsConfirmed(confirmed);
    };
    checkConfirmation();
  });

  const handleConfirm = async () => {
    if (isConfirmed || isConfirming) return;

    setIsConfirming(true);
    try {
      const profile = getUserProfile();
      if (!profile?.syncKey) {
        alert(t("reports.loginToConfirm"));
        return;
      }

      const syncKeyHash = await hashSyncKeyAsync(profile.syncKey);
      await createConfirmation(report.id, syncKeyHash);

      setIsConfirmed(true);
      setConfirmationCount((prev) => prev + 1);

      if (onConfirmationChange) {
        onConfirmationChange();
      }
    } catch (error) {
      console.error("Failed to confirm report:", error);
      alert(t("reports.confirmFailed"));
    } finally {
      setIsConfirming(false);
    }
  };

  const getRatingColor = (rating: number | null) => {
    if (!rating) return "bg-muted";
    if (rating >= 4) return "bg-green-500";
    if (rating === 3) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getRatingLabel = (rating: number | null) => {
    if (!rating) return "N/A";
    if (rating === 1) return t("reports.ratings.veryPoor");
    if (rating === 2) return t("reports.ratings.poor");
    if (rating === 3) return t("reports.ratings.okay");
    if (rating === 4) return t("reports.ratings.good");
    if (rating === 5) return t("reports.ratings.excellent");
    return "N/A";
  };

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {report.author?.display_name || t("profile.anonymous")}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Ratings */}
        <div className="flex flex-wrap gap-2 mb-3">
          {report.rating_dry !== null && (
            <Badge variant="outline" className="gap-1.5">
              <Droplets className="h-3 w-3" />
              <span className="text-xs">
                {t("reports.dryness")}: {getRatingLabel(report.rating_dry)}
              </span>
              <div className={`h-2 w-2 rounded-full ${getRatingColor(report.rating_dry)}`} />
            </Badge>
          )}
          {report.rating_wind !== null && (
            <Badge variant="outline" className="gap-1.5">
              <Wind className="h-3 w-3" />
              <span className="text-xs">
                {t("reports.wind")}: {getRatingLabel(report.rating_wind)}
              </span>
              <div className={`h-2 w-2 rounded-full ${getRatingColor(report.rating_wind)}`} />
            </Badge>
          )}
          {report.rating_crowds !== null && (
            <Badge variant="outline" className="gap-1.5">
              <Users className="h-3 w-3" />
              <span className="text-xs">
                {t("reports.crowds")}: {getRatingLabel(report.rating_crowds)}
              </span>
              <div className={`h-2 w-2 rounded-full ${getRatingColor(report.rating_crowds)}`} />
            </Badge>
          )}
        </div>

        {/* Text */}
        {report.text && (
          <p className="text-sm text-foreground mb-3 whitespace-pre-wrap">{report.text}</p>
        )}

        {/* Confirmation Button */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant={isConfirmed ? "default" : "ghost"}
            size="sm"
            onClick={handleConfirm}
            disabled={isConfirmed || isConfirming}
            className={isConfirmed ? "bg-orange-500 hover:bg-orange-600" : ""}
          >
            <ThumbsUp className={`h-3 w-3 mr-1.5 ${isConfirmed ? "fill-current" : ""}`} />
            {t("reports.helpful")} {confirmationCount > 0 && `(${confirmationCount})`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
