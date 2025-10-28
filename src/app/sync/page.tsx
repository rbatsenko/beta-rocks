"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Loader2, AlertTriangle, Cloud } from "lucide-react";
import { isValidSyncKey, setSyncKey, formatSyncKeyForDisplay } from "@/lib/auth/sync-key";
import { useClientTranslation } from "@/hooks/useClientTranslation";

export default function SyncPage() {
  const { t } = useClientTranslation("common");
  const searchParams = useSearchParams();
  const router = useRouter();
  const [syncKey, setSyncKeyState] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"validating" | "valid" | "invalid">("validating");

  useEffect(() => {
    const key = searchParams.get("key");

    if (!key) {
      setError(t("sync.page.noKeyError"));
      setStatus("invalid");
      return;
    }

    // Validate the sync key
    if (!isValidSyncKey(key)) {
      setError(t("sync.page.invalidKeyError"));
      setStatus("invalid");
      return;
    }

    setSyncKeyState(key);
    setStatus("valid");
  }, [searchParams, t]);

  const handleRestore = async () => {
    if (!syncKey) return;

    setIsRestoring(true);
    try {
      // First, clear ALL local storage (sync key, user profile, favorites, chat history, etc.)
      // This ensures we start fresh with the restored key and prevents data conflicts
      localStorage.clear();

      // Set the new sync key in localStorage
      setSyncKey(syncKey);

      // Redirect to home with full page reload after a brief delay
      // Using window.location.href instead of router.push to ensure all state is reset
      setTimeout(() => {
        window.location.href = "/?synced=true";
      }, 1000);
    } catch (err) {
      console.error("Failed to restore sync key:", err);
      setError(t("sync.page.restoreError"));
      setIsRestoring(false);
    }
  };

  const handleCancel = () => {
    router.push("/");
  };

  if (status === "validating") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">{t("sync.page.validating")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle>{t("sync.page.invalidTitle")}</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCancel} className="w-full">
              {t("sync.page.goHome")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-orange-500" />
            <CardTitle>{t("sync.page.restoreTitle")}</CardTitle>
          </div>
          <CardDescription>{t("sync.page.restoreDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("sync.page.syncKeyLabel")}</label>
            <div className="p-3 bg-muted rounded-md font-mono text-sm break-all">
              {formatSyncKeyForDisplay(syncKey || "")}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isRestoring ? (
            <div className="flex items-center justify-center gap-2 p-4 bg-green-500/10 text-green-700 dark:text-green-400 rounded-md">
              <Check className="h-5 w-5" />
              <span className="font-medium">{t("sync.page.restoreSuccess")}</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1"
                disabled={isRestoring}
              >
                <X className="h-4 w-4" />
                {t("sync.page.cancel")}
              </Button>
              <Button onClick={handleRestore} className="flex-1" disabled={isRestoring}>
                <Check className="h-4 w-4" />
                {t("sync.page.restore")}
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            {t("sync.page.replaceWarning")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
