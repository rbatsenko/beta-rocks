import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { Toaster } from "@/components/ui/toaster";
import "@/index.css";

export const metadata: Metadata = {
  title: "temps.rocks - Real-time Climbing Conditions",
  description:
    "Chat with temps.rocks for instant climbing conditions at any crag, sector, or route worldwide. Get real-time weather forecasts, friction analysis, optimal climbing windows, and AI-powered insights - completely free for climbers.",
  authors: [{ name: "temps.rocks" }],
  keywords: ["climbing", "weather", "conditions", "friction", "crag", "rock climbing", "bouldering", "sport climbing", "forecast"],
  openGraph: {
    title: "temps.rocks - Real-time Climbing Conditions",
    description:
      "Chat naturally to get instant climbing conditions for any crag worldwide. Real-time weather, friction analysis, optimal climbing windows, and 14-day forecasts. Free for climbers.",
    url: "https://temps.rocks",
    siteName: "temps.rocks",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "temps.rocks - Climbing Conditions Chat",
    description: "Ask about any crag and get instant weather, friction scores, and optimal climbing windows. Free AI-powered climbing conditions assistant.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <I18nProvider>
            {children}
            <Toaster />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
