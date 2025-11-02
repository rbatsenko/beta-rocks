import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { RootLayoutClient } from "@/components/RootLayoutClient";
import { Toaster } from "@/components/ui/toaster";
import "@/index.css";

export const metadata: Metadata = {
  title: "beta.rocks - Climbing Conditions, Weather & Reports for Any Crag",
  description:
    "Real-time climbing conditions, weather forecasts, friction scores, and community reports for crags worldwide. Optimal climbing windows and route information.",
  authors: [{ name: "beta.rocks" }],
  keywords: [
    "climbing",
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
    "climbing weather",
  ],
  openGraph: {
    title: "beta.rocks - Climbing conditions, weather & reports for any crag",
    description:
      "Real-time climbing conditions, weather forecasts, friction scores, and community reports for crags worldwide. Optimal climbing windows and route information.",
    url: "https://beta.rocks",
    siteName: "beta.rocks",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "beta.rocks - Climbing conditions & weather",
    description: "Real-time climbing conditions, weather forecasts, and community reports for crags worldwide.",
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
              <RootLayoutClient>{children}</RootLayoutClient>
              <Toaster />
            </I18nProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
