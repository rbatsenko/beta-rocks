import type { Metadata } from "next";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { ApiEndpoints } from "@/components/docs/ApiEndpoints";

export const metadata: Metadata = {
  title: "API Documentation - beta.rocks",
  description: "Public API v1 documentation for beta.rocks. Search crags, get crag details, find nearby climbing areas, fetch community reports, and submit reports programmatically.",
  openGraph: {
    title: "beta.rocks API Documentation",
    description: "Public REST API for climbing crags, conditions, and community reports. Search 8,000+ crags worldwide.",
    url: "https://beta.rocks/docs/api",
    siteName: "beta.rocks",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "beta.rocks API Documentation",
    description: "Public REST API for climbing crags, conditions, and community reports.",
  },
  alternates: {
    canonical: "https://beta.rocks/docs/api",
    types: {
      "text/plain": "https://beta.rocks/llms-full.txt",
    },
  },
};

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav header */}
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex h-14 items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/></svg>
            <span className="font-bold">beta.rocks</span>
          </a>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">API Documentation</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">beta.rocks API</h1>
          <p className="text-muted-foreground text-lg">
            Public API v1 for searching crags, fetching conditions, and submitting community reports.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="px-2 py-0.5 rounded bg-muted text-xs font-medium">v1</span>
            <span>Base URL:</span>
            <code className="text-foreground">https://beta.rocks/api/v1</code>
          </div>
        </div>

        {/* Overview */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Overview</h2>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>All responses return JSON</li>
            <li>CORS is enabled for all origins</li>
            <li>Errors return <code className="text-xs bg-muted px-1 py-0.5 rounded">{`{ "error": "message" }`}</code> with appropriate HTTP status codes</li>
            <li>No authentication required for GET endpoints</li>
            <li>POST endpoints require a <code className="text-xs bg-muted px-1 py-0.5 rounded">sync_key</code> for attribution</li>
          </ul>
        </div>

        {/* Sync Key */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Authentication</h2>
          <p className="text-sm text-muted-foreground">
            GET endpoints are public and require no authentication. POST endpoints require a <code className="text-xs bg-muted px-1 py-0.5 rounded">sync_key</code> - a UUID
            that identifies a beta.rocks user. Users create their profile and sync key in the app under Settings. It&apos;s used for multi-device sync and anonymous identity (no email or password needed).
          </p>
          <p className="text-sm text-muted-foreground">
            When building an integration, your app should ask users for their beta.rocks sync key to submit reports on their behalf.
            The sync key is hashed server-side and never stored in plaintext.
          </p>
        </div>

        <hr className="border-border" />

        {/* Interactive Endpoints */}
        <ApiEndpoints />

        <hr className="border-border" />

        {/* Error Codes */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Error codes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 text-muted-foreground font-medium">Status</th>
                  <th className="pb-2 text-muted-foreground font-medium">Meaning</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono">400</td>
                  <td className="py-2">Bad request - missing or invalid parameters</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono">401</td>
                  <td className="py-2">Unauthorized - invalid sync_key</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono">404</td>
                  <td className="py-2">Not found - crag does not exist</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono">500</td>
                  <td className="py-2">Server error</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Plain-text fallback for LLMs/crawlers that can't run JS */}
        <noscript>
          <div className="mt-8 p-4 border border-border rounded text-sm text-muted-foreground">
            <p>This page requires JavaScript for the interactive playground. For a plain-text version of this API documentation, visit: <a href="https://beta.rocks/llms-full.txt">https://beta.rocks/llms-full.txt</a></p>
            <h3 className="mt-4 font-semibold">Endpoints</h3>
            <ul className="mt-2 space-y-1">
              <li>GET /api/v1/crags/search?q=query - Search crags by name</li>
              <li>GET /api/v1/crags/:id - Get crag detail with sectors</li>
              <li>GET /api/v1/crags/nearby?lat=X&amp;lon=Y - Find crags near coordinates</li>
              <li>GET /api/v1/crags/:id/reports - Get community reports for a crag</li>
              <li>POST /api/v1/reports - Submit a community report (requires sync_key)</li>
            </ul>
          </div>
        </noscript>

        {/* Footer */}
        <div className="pt-6 text-center text-xs text-muted-foreground">
          <p>Built with care by <a href="https://beta.rocks" className="underline underline-offset-2 hover:text-foreground transition-colors">beta.rocks</a></p>
        </div>
      </div>
    </div>
  );
}
