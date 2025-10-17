import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, MessageSquare, Users, MapPin, Zap, Lock } from "lucide-react";

const features = [
  {
    icon: Cloud,
    title: "Real-time Weather",
    description: "Accurate forecasts from Open-Meteo with sun/shade calculations for specific sectors",
  },
  {
    icon: MessageSquare,
    title: "Chat Interface",
    description: "Natural language queries powered by AI. Ask in any language, get instant answers",
  },
  {
    icon: Users,
    title: "Community Reports",
    description: "Share and confirm current conditions. Help fellow climbers with real-time updates",
  },
  {
    icon: MapPin,
    title: "Global Coverage",
    description: "Any crag, sector, or route worldwide via OpenBeta database integration",
  },
  {
    icon: Zap,
    title: "Works Offline",
    description: "Local-first design. Save data offline and sync across devices with a sync key",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "Anonymous by default. No accounts required. Your data stays yours",
  },
];

const Features = () => {
  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Everything You Need</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive climbing conditions at your fingertips, completely free
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
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
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
