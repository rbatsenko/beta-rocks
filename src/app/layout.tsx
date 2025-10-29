import type { Metadata } from "next";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { LoadingProvider, NavigationProgress } from "@/components/NavigationProgress";
import { Toaster } from "@/components/ui/toaster";
import "@/index.css";

export const metadata: Metadata = {
  title: "temps.rocks - Climbing Conditions",
  description:
    "Ask about any crag and get climbing conditions. Weather forecasts, friction scores based on rock type, and optimal climbing windows.",
  authors: [{ name: "temps.rocks" }],
  keywords: [
    "climbing",
    "weather",
    "conditions",
    "friction",
    "crag",
    "rock climbing",
    "bouldering",
    "sport climbing",
    "forecast",
  ],
  openGraph: {
    title: "temps.rocks - Climbing Conditions",
    description:
      "Ask about any crag and get climbing conditions. Weather forecasts, friction scores based on rock type, and optimal climbing windows.",
    url: "https://temps.rocks",
    siteName: "temps.rocks",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "temps.rocks",
    description:
      "Ask about any crag and get climbing conditions. Weather forecasts, friction scores, and optimal climbing windows.",
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
          <QueryProvider>
            <I18nProvider>
              <LoadingProvider>
                <Suspense fallback={null}>
                  <NavigationProgress />
                </Suspense>
                {children}
                <Toaster />
              </LoadingProvider>
            </I18nProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
