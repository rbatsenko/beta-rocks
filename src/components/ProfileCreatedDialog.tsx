"use client";

import { useState } from "react";
import { Copy, Check, Key, Info, CheckCircle, Mail } from "lucide-react";
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
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { QRCodeSVG } from "qrcode.react";

interface ProfileCreatedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  syncKey: string;
  completedAction: string;
}

export function ProfileCreatedDialog({
  open,
  onOpenChange,
  syncKey,
  completedAction,
}: ProfileCreatedDialogProps) {
  const { t } = useClientTranslation("common");
  const [isCopied, setIsCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleCopySyncKey = async () => {
    try {
      await navigator.clipboard.writeText(syncKey);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy sync key:", error);
    }
  };

  const getSyncUrl = () => {
    if (!syncKey) return "";
    return `${window.location.origin}/sync?key=${syncKey}`;
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendEmail = async () => {
    if (!isValidEmail(email)) return;

    setSending(true);
    setEmailError(null);

    try {
      const response = await fetch("/api/send-sync-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          syncKey,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send email");
      }

      setEmailSent(true);
      setTimeout(() => {
        setEmailSent(false);
        setEmail("");
      }, 5000);
    } catch (error) {
      console.error("Error sending email:", error);
      setEmailError(t("profileCreated.emailSection.error"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-green-500" />
            {t("profileCreated.title")}
          </DialogTitle>
          <DialogDescription>{t("profileCreated.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Completed Action Confirmation */}
          <div className="flex gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="text-2xl">✅</div>
            <div className="space-y-1">
              <p className="font-medium text-green-900 dark:text-green-100">
                {t("profileCreated.actionCompleted", { action: completedAction })}
              </p>
            </div>
          </div>

          {/* Sync Key Display */}
          <div>
            <Label htmlFor="syncKey">{t("profileCreated.syncKeyLabel")}</Label>
            <p className="text-sm text-muted-foreground mb-2">
              {t("profileCreated.syncKeyDescription")}
            </p>
            <div className="flex gap-2">
              <Input
                id="syncKey"
                value={syncKey}
                readOnly
                className="font-mono text-sm select-all"
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
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center space-y-2 py-4">
            <Label>{t("profileCreated.qrCodeLabel")}</Label>
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG value={getSyncUrl()} size={200} level="M" />
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-md">
              {t("profileCreated.qrCodeDescription")}
            </p>
          </div>

          {/* Privacy Messages */}
          <div className="flex gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                {t("profileCreated.privacyTitle")}
              </p>
              <ul className="space-y-1 text-blue-800 dark:text-blue-200 list-disc list-inside">
                <li>{t("profileCreated.saveKeySafe")}</li>
                <li>{t("profileCreated.screenshotQR")}</li>
                <li>{t("profileCreated.needForSync")}</li>
              </ul>
            </div>
          </div>

          {/* Email Send Section */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">{t("profileCreated.emailSection.title")}</h3>
            </div>

            <div className="flex gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <ul className="text-xs space-y-1 text-blue-800 dark:text-blue-200">
                  <li>✓ {t("profileCreated.emailSection.privacyNote1")}</li>
                  <li>✓ {t("profileCreated.emailSection.privacyNote2")}</li>
                  <li>✓ {t("profileCreated.emailSection.privacyNote3")}</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                type="email"
                placeholder={t("profileCreated.emailSection.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sending || emailSent}
                className="flex-1"
              />
              <Button
                onClick={handleSendEmail}
                disabled={!isValidEmail(email) || sending || emailSent}
                variant="outline"
              >
                {sending
                  ? t("profileCreated.emailSection.sending")
                  : t("profileCreated.emailSection.sendButton")}
              </Button>
            </div>

            {emailSent && (
              <div className="flex gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-sm text-green-800 dark:text-green-200">
                  {t("profileCreated.emailSection.success")}
                </p>
              </div>
            )}

            {emailError && (
              <div className="flex gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <Info className="h-5 w-5 text-red-500 shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-200">{emailError}</p>
              </div>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)} className="w-full">
            {t("profileCreated.gotIt")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
