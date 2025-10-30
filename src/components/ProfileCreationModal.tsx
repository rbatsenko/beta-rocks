"use client";

/**
 * ProfileCreationModal Component
 *
 * A privacy-first modal that prompts users to create a profile when attempting
 * actions that require authentication (favoriting, reporting, voting).
 *
 * Features:
 * - Context-aware messaging based on trigger action
 * - Privacy-first approach (no email/password required)
 * - Creates anonymous profile with sync key
 * - Calls onCreated callback after successful profile creation
 * - Sign in tab for users with existing sync keys
 *
 * @example
 * ```tsx
 * const [showCreateProfile, setShowCreateProfile] = useState(false);
 *
 * <ProfileCreationModal
 *   open={showCreateProfile}
 *   onOpenChange={setShowCreateProfile}
 *   trigger="favorite" // or "report" or "vote" or "manual"
 *   onCreated={(profile) => {
 *     console.log("Profile created:", profile);
 *     // Proceed with the original action (e.g., toggle favorite)
 *   }}
 * />
 * ```
 */

import { Heart, MessageSquare, ThumbsUp, Shield, Key, Smartphone, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import {
  initializeUserProfile,
  isValidSyncKey,
  setSyncKey,
  type UserProfile,
} from "@/lib/auth/sync-key";
import { useState } from "react";

interface ProfileCreationModalProps {
  /** Controls modal visibility */
  open: boolean;
  /** Callback to change modal visibility state */
  onOpenChange: (open: boolean) => void;
  /** The action that triggered the profile creation prompt */
  trigger: "favorite" | "report" | "vote" | "manual";
  /** Callback invoked after successful profile creation */
  onCreated: (profile: UserProfile) => void;
}

export function ProfileCreationModal({
  open,
  onOpenChange,
  trigger,
  onCreated,
}: ProfileCreationModalProps) {
  const { t } = useClientTranslation("common");
  const [isCreating, setIsCreating] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [syncKeyInput, setSyncKeyInput] = useState("");
  const [signInError, setSignInError] = useState<string | null>(null);

  const handleCreateProfile = async () => {
    setIsCreating(true);
    try {
      const profile = await initializeUserProfile();
      onCreated(profile);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create profile:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSignIn = async () => {
    setSignInError(null);

    // Validate sync key format
    if (!isValidSyncKey(syncKeyInput.trim())) {
      setSignInError(t("profileCreation.signIn.invalidKey"));
      return;
    }

    setIsSigningIn(true);
    try {
      // Clear all local storage to start fresh
      localStorage.clear();

      // Set the sync key
      setSyncKey(syncKeyInput.trim());

      // Initialize profile (this will fetch from database)
      const profile = await initializeUserProfile();

      // Call onCreated callback
      onCreated(profile);
      onOpenChange(false);

      // Reload page to ensure all data is properly loaded
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("Failed to sign in:", error);
      setSignInError(t("profileCreation.signIn.invalidKey"));
      setIsSigningIn(false);
    }
  };

  // Select benefit icon and text based on trigger
  const getBenefitContent = () => {
    switch (trigger) {
      case "favorite":
        return {
          icon: Heart,
          title: t("profileCreation.benefits.favorite.title"),
          description: t("profileCreation.benefits.favorite.description"),
        };
      case "report":
        return {
          icon: MessageSquare,
          title: t("profileCreation.benefits.report.title"),
          description: t("profileCreation.benefits.report.description"),
        };
      case "vote":
        return {
          icon: ThumbsUp,
          title: t("profileCreation.benefits.vote.title"),
          description: t("profileCreation.benefits.vote.description"),
        };
      case "manual":
        return {
          icon: User,
          title: t("profileCreation.benefits.manual.title"),
          description: t("profileCreation.benefits.manual.description"),
        };
    }
  };

  const benefitContent = getBenefitContent();
  const BenefitIcon = benefitContent.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("profileCreation.title")}</DialogTitle>
          <DialogDescription>{t("profileCreation.subtitle")}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">{t("profileCreation.tabs.create")}</TabsTrigger>
            <TabsTrigger value="signin">{t("profileCreation.tabs.signIn")}</TabsTrigger>
          </TabsList>

          {/* Create Profile Tab */}
          <TabsContent value="create" className="space-y-4">
            <div className="space-y-4 py-2">
              {/* Primary benefit based on trigger */}
              <div className="flex gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <BenefitIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">{benefitContent.title}</h4>
                  <p className="text-sm text-muted-foreground">{benefitContent.description}</p>
                </div>
              </div>

              {/* Privacy features */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">
                    {t("profileCreation.features.privacy.title")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("profileCreation.features.privacy.description")}
                  </p>
                </div>
              </div>

              {/* Sync key feature */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Key className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">
                    {t("profileCreation.features.syncKey.title")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("profileCreation.features.syncKey.description")}
                  </p>
                </div>
              </div>

              {/* Multi-device sync */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Smartphone className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">
                    {t("profileCreation.features.multiDevice.title")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("profileCreation.features.multiDevice.description")}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isCreating}>
                {t("profileCreation.maybeLater")}
              </Button>
              <Button onClick={handleCreateProfile} disabled={isCreating}>
                {isCreating ? t("profileCreation.creating") : t("profileCreation.createProfile")}
              </Button>
            </div>
          </TabsContent>

          {/* Sign In Tab */}
          <TabsContent value="signin" className="space-y-4">
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{t("profileCreation.signIn.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("profileCreation.signIn.description")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="syncKey">{t("profileCreation.signIn.syncKeyLabel")}</Label>
                <Input
                  id="syncKey"
                  type="text"
                  placeholder={t("profileCreation.signIn.syncKeyPlaceholder")}
                  value={syncKeyInput}
                  onChange={(e) => setSyncKeyInput(e.target.value)}
                  disabled={isSigningIn}
                  className="font-mono"
                />
              </div>

              {signInError && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                  {signInError}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSigningIn}
              >
                {t("profileCreation.maybeLater")}
              </Button>
              <Button onClick={handleSignIn} disabled={isSigningIn || !syncKeyInput.trim()}>
                {isSigningIn
                  ? t("profileCreation.signIn.signingIn")
                  : t("profileCreation.signIn.signInButton")}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
