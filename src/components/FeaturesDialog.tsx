"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, MessageSquare, Users, MapPin, Zap, Lock } from "lucide-react";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FeaturesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeaturesDialog({ open, onOpenChange }: FeaturesDialogProps) {
  const { t } = useClientTranslation("common");

  const features = [
    {
      icon: Cloud,
      titleKey: "features.realTimeWeather.title",
      descriptionKey: "features.realTimeWeather.description",
    },
    {
      icon: MessageSquare,
      titleKey: "features.chatInterface.title",
      descriptionKey: "features.chatInterface.description",
    },
    {
      icon: Users,
      titleKey: "features.communityReports.title",
      descriptionKey: "features.communityReports.description",
    },
    {
      icon: MapPin,
      titleKey: "features.globalCoverage.title",
      descriptionKey: "features.globalCoverage.description",
    },
    {
      icon: Zap,
      titleKey: "features.worksOffline.title",
      descriptionKey: "features.worksOffline.description",
    },
    {
      icon: Lock,
      titleKey: "features.privacyFirst.title",
      descriptionKey: "features.privacyFirst.description",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t("features.heading")}</DialogTitle>
          <DialogDescription>{t("features.subheading")}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-180px)] pr-4">
          <div className="grid md:grid-cols-2 gap-4 pb-4">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card key={idx} className="shadow-sm hover:shadow-md transition-all">
                  <CardHeader>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{t(feature.titleKey)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      {t(feature.descriptionKey)}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="mt-2 pt-4 border-t border-border text-sm text-muted-foreground space-y-1">
            <p>{t("footer.description")}</p>
            <p>{t("footer.attribution")}</p>
            <p>{t("footer.copyright")}</p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
