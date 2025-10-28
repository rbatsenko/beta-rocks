"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Key, AlertTriangle, Info, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getUserProfile,
  updateUserProfile as updateLocalUserProfile,
  formatSyncKeyForDisplay,
  hashSyncKeyAsync,
  isValidSyncKey,
  setSyncKey,
  type UserProfile,
} from "@/lib/auth/sync-key";
import {
  fetchOrCreateUserProfile,
  updateUserProfile as updateDbUserProfile,
} from "@/lib/db/queries";
import { deleteUserProfile } from "@/lib/chat/history.service";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { QRCodeSVG } from "qrcode.react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { t } = useClientTranslation("common");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showFullKey, setShowFullKey] = useState(false);
  const [deleteProfileConfirmOpen, setDeleteProfileConfirmOpen] = useState(false);
  const [restoreSyncKey, setRestoreSyncKey] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState("");

  useEffect(() => {
    if (open) {
      const profile = getUserProfile();
      setUserProfile(profile);
      setDisplayName(profile?.displayName || "");
    }
  }, [open]);

  const handleSaveDisplayName = async () => {
    if (!userProfile) return;

    setIsSaving(true);
    try {
      // Update local storage and cookies
      const updated = await updateLocalUserProfile({
        displayName: displayName.trim() || undefined,
      });
      setUserProfile(updated);

      // Sync to database
      if (updated.syncKey) {
        const syncKeyHash = await hashSyncKeyAsync(updated.syncKey);
        const dbProfile = await fetchOrCreateUserProfile(syncKeyHash);
        await updateDbUserProfile(dbProfile.id, {
          display_name: displayName.trim() || undefined,
        });
      }
    } catch (error) {
      console.error("Failed to save display name:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopySyncKey = async () => {
    if (!userProfile?.syncKey) return;

    try {
      await navigator.clipboard.writeText(userProfile.syncKey);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy sync key:", error);
    }
  };

  const getSyncUrl = () => {
    if (!userProfile?.syncKey) return "";
    return `${window.location.origin}/sync?key=${userProfile.syncKey}`;
  };

  const handleRestoreSyncKey = async () => {
    setRestoreError("");

    // Trim the input
    const keyToRestore = restoreSyncKey.trim();

    // Validate the sync key format
    if (!isValidSyncKey(keyToRestore)) {
      setRestoreError(t("settings.syncKey.restoreError"));
      return;
    }

    setIsRestoring(true);
    try {
      // Set the sync key in localStorage
      setSyncKey(keyToRestore);

      // Show success message
      alert(t("settings.syncKey.restoreSuccess"));

      // Reload the page to sync data
      window.location.reload();
    } catch (error) {
      console.error("Failed to restore sync key:", error);
      setRestoreError(t("settings.syncKey.restoreError"));
      setIsRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
          <DialogDescription>{t("settings.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Display Name Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="displayName">{t("settings.displayName.label")}</Label>
              <p className="text-sm text-muted-foreground mb-2">
                {t("settings.displayName.description")}
              </p>
              <div className="flex gap-2">
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("settings.displayName.placeholder")}
                  maxLength={50}
                />
                <Button onClick={handleSaveDisplayName} disabled={isSaving}>
                  {isSaving ? t("settings.saving") : t("settings.save")}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Sync Key Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {t("settings.syncKey.title")}
              </CardTitle>
              <CardDescription>{t("settings.syncKey.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sync Key Display */}
              <div>
                <Label>{t("settings.syncKey.label")}</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={
                      showFullKey
                        ? userProfile?.syncKey || ""
                        : formatSyncKeyForDisplay(userProfile?.syncKey || "")
                    }
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopySyncKey}
                    title={t("settings.syncKey.copy")}
                  >
                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1 h-auto p-0"
                  onClick={() => setShowFullKey(!showFullKey)}
                >
                  {showFullKey ? t("settings.syncKey.hideKey") : t("settings.syncKey.showFullKey")}
                </Button>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center space-y-2 py-4">
                <Label>{t("settings.syncKey.qrCode")}</Label>
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG value={getSyncUrl()} size={200} level="M" />
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-md">
                  {t("settings.syncKey.qrDescription")}
                </p>
              </div>

              {/* Save Note */}
              <div className="flex gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    {t("settings.syncKey.saveNote.title")}
                  </p>
                  <p className="text-blue-800 dark:text-blue-200">
                    {t("settings.syncKey.saveNote.description")}
                  </p>
                </div>
              </div>

              {/* Warning */}
              <div className="flex gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    {t("settings.syncKey.warning.title")}
                  </p>
                  <p className="text-amber-800 dark:text-amber-200">
                    {t("settings.syncKey.warning.description")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Restore Sync Key Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                {t("settings.syncKey.restoreTitle")}
              </CardTitle>
              <CardDescription>{t("settings.syncKey.restoreDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="restoreSyncKey">{t("settings.syncKey.restoreLabel")}</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="restoreSyncKey"
                    value={restoreSyncKey}
                    onChange={(e) => {
                      setRestoreSyncKey(e.target.value);
                      setRestoreError("");
                    }}
                    placeholder={t("settings.syncKey.restorePlaceholder")}
                    className="font-mono text-sm"
                    disabled={isRestoring}
                  />
                  <Button onClick={handleRestoreSyncKey} disabled={isRestoring || !restoreSyncKey}>
                    {isRestoring
                      ? t("settings.syncKey.restoring")
                      : t("settings.syncKey.restoreButton")}
                  </Button>
                </div>
                {restoreError && <p className="text-sm text-destructive mt-2">{restoreError}</p>}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Danger Zone */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-destructive">
                {t("settings.dangerZone.title")}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("settings.dangerZone.description")}
              </p>
            </div>
            <Button variant="destructive" onClick={() => setDeleteProfileConfirmOpen(true)}>
              {t("settings.dangerZone.deleteProfile")}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Delete Profile Confirmation Dialog */}
      <ConfirmDialog
        open={deleteProfileConfirmOpen}
        onOpenChange={setDeleteProfileConfirmOpen}
        onConfirm={async () => {
          try {
            await deleteUserProfile();
            setDeleteProfileConfirmOpen(false);
            onOpenChange(false);
            // Reload the page to reset everything
            window.location.reload();
          } catch (error) {
            console.error("Failed to delete profile:", error);
            alert(t("settings.dangerZone.deleteFailed"));
          }
        }}
        title={t("settings.dangerZone.deleteProfile")}
        description={t("settings.dangerZone.deleteProfileConfirm")}
        confirmText={t("settings.dangerZone.deleteProfile")}
        cancelText={t("dialog.cancel")}
        variant="destructive"
      />
    </Dialog>
  );
}
