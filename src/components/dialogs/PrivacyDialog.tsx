"use client";

import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, XCircle, Database, Code, Trash2, Lock } from "lucide-react";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trans } from "react-i18next";

interface PrivacyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrivacyDialog({ open, onOpenChange }: PrivacyDialogProps) {
  const { t } = useClientTranslation("common");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const sections = [
    {
      icon: XCircle,
      titleKey: "privacy.whatWeDontCollect.title",
      descriptionKey: "privacy.whatWeDontCollect.description",
    },
    {
      icon: Database,
      titleKey: "privacy.whatYouControl.title",
      descriptionKey: "privacy.whatYouControl.description",
    },
    {
      icon: Lock,
      titleKey: "privacy.howSyncWorks.title",
      descriptionKey: "privacy.howSyncWorks.description",
    },
    {
      icon: Code,
      titleKey: "privacy.openSource.title",
      descriptionKey: "privacy.openSource.description",
    },
    {
      icon: Trash2,
      titleKey: "privacy.yourRights.title",
      descriptionKey: "privacy.yourRights.description",
    },
    {
      icon: Shield,
      titleKey: "privacy.dataSecurity.title",
      descriptionKey: "privacy.dataSecurity.description",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh]"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          scrollAreaRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">{t("privacy.heading")}</DialogTitle>
          <DialogDescription>{t("privacy.subheading")}</DialogDescription>
        </DialogHeader>

        <ScrollArea ref={scrollAreaRef} className="h-[calc(90vh-180px)] pr-4" tabIndex={-1}>
          <div className="grid md:grid-cols-2 gap-4 pb-4">
            {sections.map((section, idx) => {
              const Icon = section.icon;
              return (
                <Card key={idx} className="shadow-xs hover:shadow-md transition-all">
                  <CardHeader>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{t(section.titleKey)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      {t(section.descriptionKey)}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="mt-2 pt-4 border-t border-border text-sm text-muted-foreground space-y-2">
            <p className="font-medium">{t("privacy.footer.tldr")}</p>
            <p>
              <Trans
                i18nKey="privacy.footer.github"
                components={{
                  githubLink: (
                    <a
                      href="https://github.com/rbatsenko/beta-rocks"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-foreground transition-colors"
                    />
                  ),
                }}
              />
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
