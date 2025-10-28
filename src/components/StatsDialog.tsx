"use client";

import { useState, useEffect } from "react";
import { BarChart3, MessageSquare, ThumbsUp, Star, Calendar, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { fetchOrCreateUserStats, fetchOrCreateUserProfile } from "@/lib/db/queries";
import { getUserProfile, hashSyncKeyAsync } from "@/lib/auth/sync-key";
import { formatDistanceToNow } from "date-fns";
import {
  getUserStatsFromStorage,
  saveUserStatsToStorage,
  type CachedUserStats,
} from "@/lib/storage/user-stats";

interface StatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserStats {
  reports_posted: number;
  confirmations_given: number;
  favorites_count: number;
  last_active: string;
  created_at: string;
}

export function StatsDialog({ open, onOpenChange }: StatsDialogProps) {
  const { t } = useClientTranslation("common");
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadStats();
    }
  }, [open]);

  const loadStats = async () => {
    try {
      // Load from localStorage immediately (instant, no delay)
      const cachedStats = getUserStatsFromStorage();
      if (cachedStats) {
        setStats(cachedStats as UserStats);
        setIsLoading(false);
        console.log("[StatsDialog] Loaded stats from localStorage");
      } else {
        setIsLoading(true);
      }

      // Then sync from database in the background
      const profile = getUserProfile();
      if (!profile?.syncKey) {
        console.warn("[StatsDialog] No user profile found");
        if (!cachedStats) setIsLoading(false);
        return;
      }

      // Hash the sync key and get the database profile
      const syncKeyHash = await hashSyncKeyAsync(profile.syncKey);
      const dbProfile = await fetchOrCreateUserProfile(syncKeyHash);

      if (!dbProfile?.id) {
        console.warn("[StatsDialog] Failed to get database profile");
        if (!cachedStats) setIsLoading(false);
        return;
      }

      const userStats = await fetchOrCreateUserStats(dbProfile.id);
      setStats(userStats as UserStats);

      // Update localStorage cache
      saveUserStatsToStorage(userStats as CachedUserStats);

      console.log("[StatsDialog] Updated stats from DB");
    } catch (error) {
      console.error("[StatsDialog] Failed to load user stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      icon: MessageSquare,
      label: t("stats.reportsPosted"),
      value: stats?.reports_posted ?? 0,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: ThumbsUp,
      label: t("stats.confirmationsGiven"),
      value: stats?.confirmations_given ?? 0,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      icon: Star,
      label: t("stats.favoritesCount"),
      value: stats?.favorites_count ?? 0,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-500" />
            {t("stats.title")}
          </DialogTitle>
          <DialogDescription>{t("stats.description")}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Main Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {statCards.map((stat) => (
                  <Card key={stat.label} className="border-2">
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center space-y-2">
                        <div className={`rounded-full p-3 ${stat.bgColor}`}>
                          <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        <div className="text-3xl font-bold">{stat.value}</div>
                        <div className="text-sm text-muted-foreground">{stat.label}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Activity Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {t("stats.memberSince")}:{" "}
                    {stats?.created_at
                      ? new Date(stats.created_at).toLocaleDateString()
                      : t("stats.unknown")}
                  </span>
                </div>
                {stats?.last_active && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span>
                      {t("stats.lastActive")}:{" "}
                      {formatDistanceToNow(new Date(stats.last_active), { addSuffix: true })}
                    </span>
                  </div>
                )}
              </div>

              {/* Encouragement Message */}
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <p className="text-sm text-center text-muted-foreground">
                  {stats?.reports_posted === 0 ? t("stats.encourageReports") : t("stats.thankYou")}
                </p>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
