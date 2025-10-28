"use client";

import { Cloud, Key, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useClientTranslation } from "@/hooks/useClientTranslation";

interface SyncExplainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings: () => void;
}

export function SyncExplainerDialog({
  open,
  onOpenChange,
  onOpenSettings,
}: SyncExplainerDialogProps) {
  const { t } = useClientTranslation("common");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-orange-500" />
            {t("syncExplainer.title")}
          </DialogTitle>
          <DialogDescription>{t("syncExplainer.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Key className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">
                {t("syncExplainer.features.syncKey.title")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t("syncExplainer.features.syncKey.description")}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">
                {t("syncExplainer.features.multiDevice.title")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t("syncExplainer.features.multiDevice.description")}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Cloud className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">
                {t("syncExplainer.features.privacy.title")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t("syncExplainer.features.privacy.description")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialog.close")}
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              onOpenSettings();
            }}
          >
            {t("syncExplainer.openSettings")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
