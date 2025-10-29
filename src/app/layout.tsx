import type { Metadata } from "next";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { LoadingProvider, NavigationProgress } from "@/components/NavigationProgress";
import { Toaster } from "@/components/ui/toaster";
import "@/index.css";

export const metadata: Metadata = {
  title: "beta.rocks - Get the Beta on Any Crag",
  description:
    "Get conditions, community reports, and route information for any crag worldwide. Real-time weather, friction scores, and optimal climbing windows.",
  authors: [{ name: "beta.rocks" }],
  keywords: [
    "climbing",
    "beta",
    "conditions",
    "weather",
    "friction",
    "crag",
    "rock climbing",
    "bouldering",
    "sport climbing",
    "community reports",
    "route information",
    "forecast",
  ],
  openGraph: {
    title: "beta.rocks - Get the Beta on Any Crag",
    description:
      "Get conditions, community reports, and route information for any crag worldwide. Real-time weather, friction scores, and optimal climbing windows.",
    url: "https://beta.rocks",
    siteName: "beta.rocks",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "beta.rocks",
    description: "Get conditions, community reports, and route information for any crag worldwide.",
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
                {children}
                <Toaster />
              </LoadingProvider>
            </I18nProvider>
          </QueryProvider>
        </ThemeProvider>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
      </body>
    </html>
  );
}
