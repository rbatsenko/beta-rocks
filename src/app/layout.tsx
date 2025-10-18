import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import "@/index.css";

export const metadata: Metadata = {
  title: "temps.rocks - Real-time Climbing Conditions Chat",
  description:
    "Chat with temps.rocks for instant climbing conditions at any crag, sector, or route worldwide. Free weather forecasts, community reports, and AI-powered insights for climbers.",
  authors: [{ name: "temps.rocks" }],
  openGraph: {
    title: "temps.rocks - Real-time Climbing Conditions",
    description:
      "Free climbing conditions via chat. Get instant weather, sun/shade, and community reports for any crag worldwide.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "temps.rocks - Climbing Conditions Chat",
    description: "Chat naturally to get real-time climbing conditions anywhere",
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
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
