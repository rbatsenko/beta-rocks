"use client";

import { useState, useEffect } from "react";
import {
  ThumbsUp,
  User,
  Wind,
  Droplets,
  Users,
  CloudSun,
  AlertTriangle,
  Lock,
  Mountain,
  Home,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { format, differenceInCalendarDays } from "date-fns";
import { hashSyncKeyAsync } from "@/lib/auth/sync-key";
import { createConfirmation, hasUserConfirmedReport } from "@/lib/db/queries";
import { getUserProfile } from "@/lib/auth/sync-key";
import { getDateFnsLocale } from "@/lib/i18n/date-locales";

type ReportCategory = "conditions" | "safety" | "access" | "climbing_info" | "facilities" | "other";

interface Report {
  id: string;
  category?: ReportCategory;
  text: string | null;
  rating_dry: number | null;
  rating_wind: number | null;
  rating_crowds: number | null;
  created_at: string;
  observed_at: string;
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
  const { t, i18n } = useClientTranslation("common");
  const dateLocale = getDateFnsLocale(i18n.language);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmationCount, setConfirmationCount] = useState(report.confirmations?.length || 0);

  // Check if user has already confirmed this report
  useEffect(() => {
    const checkConfirmation = async () => {
      const profile = getUserProfile();
      if (!profile?.syncKey) return;

      const syncKeyHash = await hashSyncKeyAsync(profile.syncKey);
      const confirmed = await hasUserConfirmedReport(report.id, syncKeyHash);
      setIsConfirmed(confirmed);
    };
    checkConfirmation();
  }, [report.id]);

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

  const getCategoryIcon = (category: ReportCategory) => {
    const iconClass = "h-3.5 w-3.5";
    switch (category) {
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
      default:
        return <MessageSquare className={iconClass} />;
    }
  };

  const getCategoryColor = (category: ReportCategory) => {
    switch (category) {
      case "conditions":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "safety":
        return "bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
      case "access":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
      case "climbing_info":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "facilities":
        return "bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800";
    }
  };

  const category = report.category || "conditions";

  // Format relative time based on calendar days, not hours
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const daysDiff = differenceInCalendarDays(now, date);

    if (daysDiff === 0) {
      return t("time.today");
    } else if (daysDiff === 1) {
      return t("time.yesterday");
    } else {
      return t("time.daysAgo", { count: daysDiff });
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {report.author?.display_name || t("profile.anonymous")}
            </span>
            {/* Category Badge */}
            <Badge variant="outline" className={`gap-1.5 ${getCategoryColor(category)}`}>
              {getCategoryIcon(category)}
              <span className="text-xs font-medium">{t(`reports.categories.${category}`)}</span>
            </Badge>
          </div>
          <div className="flex flex-col items-end text-right gap-0.5">
            <span className="text-xs text-muted-foreground">
              {getRelativeTime(new Date(report.observed_at))}
            </span>
            <span className="text-[10px] text-muted-foreground/70">
              {format(new Date(report.observed_at), "Pp", { locale: dateLocale })}
            </span>
          </div>
        </div>

        {/* Ratings - Only show for conditions reports */}
        {category === "conditions" &&
          (report.rating_dry !== null ||
            report.rating_wind !== null ||
            report.rating_crowds !== null) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {report.rating_dry !== null && (
                <Badge variant="outline" className="gap-1.5">
                  <Droplets className="h-3 w-3" />
                  <span className="text-xs">
                    {t("reports.dryness")}: {report.rating_dry}/5
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({t(`reports.drynessLabels.${report.rating_dry}`)})
                  </span>
                </Badge>
              )}
              {report.rating_wind !== null && (
                <Badge variant="outline" className="gap-1.5">
                  <Wind className="h-3 w-3" />
                  <span className="text-xs">
                    {t("reports.wind")}: {report.rating_wind}/5
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({t(`reports.windLabels.${report.rating_wind}`)})
                  </span>
                </Badge>
              )}
              {report.rating_crowds !== null && (
                <Badge variant="outline" className="gap-1.5">
                  <Users className="h-3 w-3" />
                  <span className="text-xs">
                    {t("reports.crowds")}: {report.rating_crowds}/5
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({t(`reports.crowdsLabels.${report.rating_crowds}`)})
                  </span>
                </Badge>
              )}
            </div>
          )}

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
            <ThumbsUp className={`h-3 w-3 ${isConfirmed ? "fill-current" : ""}`} />
            {t("reports.helpful")} {confirmationCount > 0 && `(${confirmationCount})`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
