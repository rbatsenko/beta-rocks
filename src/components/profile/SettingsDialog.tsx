"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Key, AlertTriangle, Info, Upload, Settings2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useDeleteProfile } from "@/hooks/queries/useProfileQueries";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { QRCodeSVG } from "qrcode.react";
import { useUnits } from "@/hooks/useUnits";
import { UNIT_PRESETS, detectUnitSystem, type UnitSystem } from "@/lib/units/types";
import { useToast } from "@/hooks/use-toast";
import type {
  TemperatureUnit,
  WindSpeedUnit,
  PrecipitationUnit,
  DistanceUnit,
  ElevationUnit,
} from "@/lib/units/types";
import { configToDbUnits } from "@/lib/units/storage";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { t } = useClientTranslation("common");
  const { units, updateUnits } = useUnits();
  const { toast } = useToast();
  const deleteProfile = useDeleteProfile();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingUnits, setIsSavingUnits] = useState(false);

  // Units state
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
  const [temperature, setTemperature] = useState<TemperatureUnit>("celsius");
  const [windSpeed, setWindSpeed] = useState<WindSpeedUnit>("kmh");
  const [precipitation, setPrecipitation] = useState<PrecipitationUnit>("mm");
  const [distance, setDistance] = useState<DistanceUnit>("km");
  const [elevation, setElevation] = useState<ElevationUnit>("meters");
  const [isCopied, setIsCopied] = useState(false);
  const [showFullKey, setShowFullKey] = useState(false);
  const [deleteProfileConfirmOpen, setDeleteProfileConfirmOpen] = useState(false);
  const [restoreSyncKey, setRestoreSyncKey] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);

  useEffect(() => {
    if (open) {
      // Load profile and sync from database
      const loadProfile = async () => {
        const profile = getUserProfile();
        setUserProfile(profile);
        setDisplayName(profile?.displayName || "");

        // Sync from database to get latest updates from other devices
        if (profile?.syncKey) {
          try {
            const syncKeyHash = await hashSyncKeyAsync(profile.syncKey);
            const dbProfile = await fetchOrCreateUserProfile(syncKeyHash);

            // Update localStorage if database has newer data
            if (dbProfile) {
              const updatedProfile = await updateLocalUserProfile({
                displayName: dbProfile.display_name || undefined,
                units: dbProfile.units_temperature
                  ? {
                      temperature: dbProfile.units_temperature as any,
                      windSpeed: dbProfile.units_wind_speed as any,
                      precipitation: dbProfile.units_precipitation as any,
                      distance: dbProfile.units_distance as any,
                      elevation: dbProfile.units_elevation as any,
                    }
                  : undefined,
              });
              setUserProfile(updatedProfile);
              setDisplayName(updatedProfile.displayName || "");
            }
          } catch (error) {
            console.warn("[SettingsDialog] Failed to sync from database:", error);
            // Non-critical, continue with local profile
          }
        }
      };

      loadProfile();

      // Initialize units state
      setTemperature(units.temperature);
      setWindSpeed(units.windSpeed);
      setPrecipitation(units.precipitation);
      setDistance(units.distance);
      setElevation(units.elevation);
      setUnitSystem(detectUnitSystem(units));
    }
  }, [open, units]);

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
        // Ensure profile exists in DB
        await fetchOrCreateUserProfile(syncKeyHash);
        // Update profile using secure RPC (no need to fetch ID first)
        await updateDbUserProfile(syncKeyHash, {
          display_name: displayName.trim() || undefined,
        });
      }

      // Show success toast
      toast({
        title: t("settings.displayName.saved"),
        description: t("settings.displayName.savedDescription"),
      });
    } catch (error) {
      console.error("Failed to save display name:", error);
      toast({
        title: t("settings.displayName.saveFailed"),
        description: t("settings.displayName.saveFailedDescription"),
        variant: "destructive",
      });
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

  const handleEmailSyncKey = async () => {
    if (!userProfile?.syncKey) return;

    // Basic validation
    if (!emailAddress || !emailAddress.includes("@")) {
      toast({
        title: t("settings.syncKey.emailInvalid"),
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      const response = await fetch("/api/send-sync-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailAddress,
          syncKey: userProfile.syncKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      toast({
        title: t("settings.syncKey.emailSent"),
        description: t("settings.syncKey.emailSentDescription", { email: emailAddress }),
      });

      // Reset email input
      setEmailAddress("");
      setShowEmailInput(false);
    } catch (error) {
      console.error("Error sending sync key email:", error);
      toast({
        title: t("settings.syncKey.emailFailed"),
        description:
          error instanceof Error ? error.message : t("settings.syncKey.emailFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
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
      // First, clear ALL local storage (sync key, user profile, etc.)
      // This ensures we start fresh with the restored key
      localStorage.clear();

      // Set the new sync key in localStorage
      setSyncKey(keyToRestore);

      // Show success toast
      toast({
        title: t("settings.syncKey.restoreSuccess"),
        description: t("settings.syncKey.restoreSuccessDescription"),
      });

      // Give user time to see the toast, then reload
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Failed to restore sync key:", error);
      setRestoreError(t("settings.syncKey.restoreError"));
      setIsRestoring(false);
    }
  };

  const handleUnitSystemChange = (system: UnitSystem) => {
    setUnitSystem(system);
    if (system !== "custom") {
      const preset = UNIT_PRESETS[system];
      setTemperature(preset.temperature);
      setWindSpeed(preset.windSpeed);
      setPrecipitation(preset.precipitation);
      setDistance(preset.distance);
      setElevation(preset.elevation);
    }
  };

  const handleSaveUnits = async () => {
    setIsSavingUnits(true);
    try {
      const newUnits = {
        temperature,
        windSpeed,
        precipitation,
        distance,
        elevation,
      };

      // Update local storage via hook
      await updateUnits(newUnits);

      // Sync to database
      if (userProfile?.syncKey) {
        const syncKeyHash = await hashSyncKeyAsync(userProfile.syncKey);
        // Ensure profile exists in DB
        await fetchOrCreateUserProfile(syncKeyHash);
        // Update profile using secure RPC (no need to fetch ID first)
        await updateDbUserProfile(syncKeyHash, configToDbUnits(newUnits));
      }

      // Update unit system detection
      setUnitSystem(detectUnitSystem(newUnits));

      // Show success toast
      toast({
        title: t("settings.units.saved"),
        description: t("settings.units.savedDescription"),
      });
    } catch (error) {
      console.error("Failed to save units:", error);
      toast({
        title: t("settings.units.saveFailed"),
        description: t("settings.units.saveFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setIsSavingUnits(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-full sm:max-w-2xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden w-full inset-0 sm:inset-auto translate-x-0 translate-y-0 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] rounded-none sm:rounded-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
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

          {/* Units Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                {t("settings.units.title")}
              </CardTitle>
              <CardDescription>{t("settings.units.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Unit System Preset */}
              <div>
                <Label htmlFor="unitSystem">{t("settings.units.systemLabel")}</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  {t("settings.units.systemDescription")}
                </p>
                <Select
                  value={unitSystem}
                  onValueChange={(v) => handleUnitSystemChange(v as UnitSystem)}
                >
                  <SelectTrigger id="unitSystem">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">{t("settings.units.systems.metric")}</SelectItem>
                    <SelectItem value="imperial">{t("settings.units.systems.imperial")}</SelectItem>
                    <SelectItem value="uk">{t("settings.units.systems.uk")}</SelectItem>
                    <SelectItem value="custom">{t("settings.units.systems.custom")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Individual Unit Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Temperature */}
                <div>
                  <Label htmlFor="temperature">{t("settings.units.temperature")}</Label>
                  <Select
                    value={temperature}
                    onValueChange={(v) => {
                      setTemperature(v as TemperatureUnit);
                      setUnitSystem("custom");
                    }}
                  >
                    <SelectTrigger id="temperature">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="celsius">
                        {t("settings.units.temperatureUnits.celsius")}
                      </SelectItem>
                      <SelectItem value="fahrenheit">
                        {t("settings.units.temperatureUnits.fahrenheit")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Wind Speed */}
                <div>
                  <Label htmlFor="windSpeed">{t("settings.units.windSpeed")}</Label>
                  <Select
                    value={windSpeed}
                    onValueChange={(v) => {
                      setWindSpeed(v as WindSpeedUnit);
                      setUnitSystem("custom");
                    }}
                  >
                    <SelectTrigger id="windSpeed">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kmh">{t("settings.units.windSpeedUnits.kmh")}</SelectItem>
                      <SelectItem value="mph">{t("settings.units.windSpeedUnits.mph")}</SelectItem>
                      <SelectItem value="ms">{t("settings.units.windSpeedUnits.ms")}</SelectItem>
                      <SelectItem value="knots">
                        {t("settings.units.windSpeedUnits.knots")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Precipitation */}
                <div>
                  <Label htmlFor="precipitation">{t("settings.units.precipitation")}</Label>
                  <Select
                    value={precipitation}
                    onValueChange={(v) => {
                      setPrecipitation(v as PrecipitationUnit);
                      setUnitSystem("custom");
                    }}
                  >
                    <SelectTrigger id="precipitation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm">
                        {t("settings.units.precipitationUnits.mm")}
                      </SelectItem>
                      <SelectItem value="inches">
                        {t("settings.units.precipitationUnits.inches")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Distance */}
                <div>
                  <Label htmlFor="distance">{t("settings.units.distance")}</Label>
                  <Select
                    value={distance}
                    onValueChange={(v) => {
                      setDistance(v as DistanceUnit);
                      setUnitSystem("custom");
                    }}
                  >
                    <SelectTrigger id="distance">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="km">{t("settings.units.distanceUnits.km")}</SelectItem>
                      <SelectItem value="miles">
                        {t("settings.units.distanceUnits.miles")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Elevation */}
                <div>
                  <Label htmlFor="elevation">{t("settings.units.elevation")}</Label>
                  <Select
                    value={elevation}
                    onValueChange={(v) => {
                      setElevation(v as ElevationUnit);
                      setUnitSystem("custom");
                    }}
                  >
                    <SelectTrigger id="elevation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meters">
                        {t("settings.units.elevationUnits.meters")}
                      </SelectItem>
                      <SelectItem value="feet">
                        {t("settings.units.elevationUnits.feet")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Save Button */}
              <Button onClick={handleSaveUnits} disabled={isSavingUnits} className="w-full">
                {isSavingUnits ? t("settings.saving") : t("settings.save")}
              </Button>
            </CardContent>
          </Card>

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

              {/* Email Sync Key */}
              <div>
                {!showEmailInput ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEmailInput(true)}
                    className="w-full"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {t("settings.syncKey.emailButton")}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="emailAddress">{t("settings.syncKey.emailLabel")}</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        id="emailAddress"
                        type="email"
                        placeholder={t("settings.syncKey.emailPlaceholder")}
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        disabled={isSendingEmail}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !isSendingEmail) {
                            handleEmailSyncKey();
                          }
                        }}
                        className="flex-1"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleEmailSyncKey}
                          disabled={isSendingEmail || !emailAddress}
                          size="sm"
                          className="flex-1 sm:flex-none"
                        >
                          {isSendingEmail
                            ? t("settings.syncKey.emailSending")
                            : t("settings.syncKey.emailSend")}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowEmailInput(false);
                            setEmailAddress("");
                          }}
                          disabled={isSendingEmail}
                          size="sm"
                          className="flex-1 sm:flex-none"
                        >
                          {t("dialog.cancel")}
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.syncKey.emailPrivacy")}
                    </p>
                  </div>
                )}
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
            await deleteProfile.mutateAsync();
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
