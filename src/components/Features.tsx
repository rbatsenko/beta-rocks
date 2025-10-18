"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, MessageSquare, Users, MapPin, Zap, Lock } from "lucide-react";
import { useClientTranslation } from "@/hooks/useClientTranslation";

const Features = () => {
  const { t } = useClientTranslation('common');

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
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">{t('features.heading')}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('features.subheading')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card
                key={idx}
                className="shadow-soft hover:shadow-medium transition-smooth hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>{t(feature.titleKey)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{t(feature.descriptionKey)}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
