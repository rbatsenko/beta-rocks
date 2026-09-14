import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export const metadata: Metadata = {
  title: "MCP Server - beta.rocks",
  description:
    "Connect Claude and other AI assistants to beta.rocks over the Model Context Protocol. Search crags, fetch climbing conditions and community reports, and submit reports.",
  openGraph: {
    title: "beta.rocks MCP Server",
    description:
      "Give your AI assistant access to climbing conditions and community reports for 8,000+ crags worldwide.",
    url: "https://beta.rocks/docs/mcp",
    siteName: "beta.rocks",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "beta.rocks MCP Server",
    description: "Connect Claude and other AI assistants to climbing conditions and crag reports.",
  },
  alternates: {
    canonical: "https://beta.rocks/docs/mcp",
  },
};

interface ToolParam {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}

interface Tool {
  name: string;
  title: string;
  description: string;
  params: ToolParam[];
}

/** Mirrors the tools registered in src/app/api/mcp/route.ts. */
const TOOLS: Tool[] = [
  {
    name: "search_crags",
    title: "Search Crags",
    description:
      "Search climbing crags by name. Returns matching crags with location, rock type and climbing types.",
    params: [
      { name: "query", type: "string", required: true, description: "Search term (min 2 characters)" },
      { name: "limit", type: "number", description: "Max results, 1–10 (default 10)" },
    ],
  },
  {
    name: "get_crag",
    title: "Get Crag",
    description:
      "Detailed information about a specific crag by ID, including its sectors, rock type and location.",
    params: [
      { name: "id", type: "string", required: true, description: "Crag ID, e.g. osm_relation_17696060" },
    ],
  },
  {
    name: "find_nearby_crags",
    title: "Find Nearby Crags",
    description: "Find crags near a set of coordinates. Useful for discovering what's climbable in an area.",
    params: [
      { name: "lat", type: "number", required: true, description: "Latitude" },
      { name: "lon", type: "number", required: true, description: "Longitude" },
      { name: "radius", type: "number", description: "Radius in metres, 1–50000 (default 5000)" },
      { name: "limit", type: "number", description: "Max results, 1–10 (default 10)" },
    ],
  },
  {
    name: "get_crag_reports",
    title: "Get Crag Reports",
    description:
      "Community reports for a crag — conditions, safety, access and more, submitted by climbers. Includes reports filed against the crag's sectors, with out-of-date reports sorted last.",
    params: [
      { name: "id", type: "string", required: true, description: "Crag ID" },
      { name: "limit", type: "number", description: "Max results, 1–100 (default 20)" },
      { name: "offset", type: "number", description: "Pagination offset (default 0)" },
      { name: "category", type: "enum", description: "Filter by category (see categories below)" },
    ],
  },
  {
    name: "get_conditions",
    title: "Get Conditions",
    description:
      "Climbing-relevant weather for a crag: risk flags (rain, condensation, wet rock), a plain-language summary, an overall good / fair / poor label, dry windows, precipitation totals and warnings.",
    params: [{ name: "id", type: "string", required: true, description: "Crag ID" }],
  },
  {
    name: "submit_report",
    title: "Submit Report",
    description:
      "Submit a community report for a crag. Requires a sync key, so the report is attributed to a real beta.rocks profile.",
    params: [
      { name: "crag_id", type: "string", required: true, description: "Crag ID to report on" },
      { name: "category", type: "enum", required: true, description: "Report category" },
      { name: "message", type: "string", required: true, description: "Report text, 1–2000 characters" },
      { name: "sync_key", type: "string", required: true, description: "Your beta.rocks sync key" },
      { name: "rating_dry", type: "number", description: "Dryness 1–5 (conditions category)" },
      { name: "rating_wind", type: "number", description: "Wind 1–5 (conditions category)" },
      { name: "rating_crowds", type: "number", description: "Crowds 1–5 (conditions category)" },
      { name: "lost_found_type", type: '"lost" | "found"', description: "Required when category is lost_found" },
      { name: "source", type: "string", description: "Identifier for the app making the call" },
    ],
  },
];

const CATEGORIES = [
  "conditions",
  "safety",
  "access",
  "climbing_info",
  "facilities",
  "lost_found",
  "other",
];

const MCP_URL = "https://beta.rocks/api/mcp";

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded border border-border bg-muted/50 p-3 text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

export default function McpDocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav header */}
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/></svg>
            <span className="font-bold">beta.rocks</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">MCP Server</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">beta.rocks MCP</h1>
          <p className="text-muted-foreground text-lg">
            Give Claude — or any assistant that speaks the Model Context Protocol — direct access to
            crags, climbing conditions and community reports.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="px-2 py-0.5 rounded bg-muted text-xs font-medium">MCP</span>
            <span>Endpoint:</span>
            <code className="text-foreground">{MCP_URL}</code>
          </div>
        </div>

        {/* Overview */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Overview</h2>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Streamable HTTP transport — connect remotely, nothing to install</li>
            <li>Stateless: each request stands alone, so no session handling is needed</li>
            <li>Reading crags, conditions and reports needs no authentication</li>
            <li>
              Only <code className="text-xs bg-muted px-1 py-0.5 rounded">submit_report</code> needs a
              sync key
            </li>
            <li>
              Wraps the same{" "}
              <Link href="/docs/api" className="underline underline-offset-2 hover:text-foreground transition-colors">
                public REST API
              </Link>
              , so both surfaces return the same data
            </li>
          </ul>
        </div>

        <hr className="border-border" />

        {/* Connecting */}
        <div className="space-y-5">
          <h2 className="text-xl font-semibold">Connecting</h2>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Claude apps (remote)</h3>
            <p className="text-sm text-muted-foreground">
              Add an MCP integration in settings using the server URL. Nothing to install.
            </p>
            <CodeBlock>{MCP_URL}</CodeBlock>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Claude Code</h3>
            <CodeBlock>{`claude mcp add beta-rocks -- npx beta-rocks-mcp`}</CodeBlock>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              Claude Desktop, Cursor, Windsurf, Cline &amp; friends
            </h3>
            <p className="text-sm text-muted-foreground">
              The config is the same for any client that supports MCP over stdio:
            </p>
            <CodeBlock>{`{
  "mcpServers": {
    "beta-rocks": {
      "command": "npx",
      "args": ["beta-rocks-mcp"]
    }
  }
}`}</CodeBlock>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Environment variables</h3>
            <p className="text-sm text-muted-foreground">
              Only needed for the npm package — set your sync key to submit reports.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 pr-4 text-muted-foreground font-medium">Variable</th>
                    <th className="pb-2 pr-4 text-muted-foreground font-medium">Default</th>
                    <th className="pb-2 text-muted-foreground font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">BETA_ROCKS_SYNC_KEY</td>
                    <td className="py-2 pr-4 font-mono text-xs">—</td>
                    <td className="py-2">Your sync key, required to submit reports</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">BETA_ROCKS_API_URL</td>
                    <td className="py-2 pr-4 font-mono text-xs">https://beta.rocks</td>
                    <td className="py-2">API base URL</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <CodeBlock>{`{
  "mcpServers": {
    "beta-rocks": {
      "command": "npx",
      "args": ["beta-rocks-mcp"],
      "env": {
        "BETA_ROCKS_SYNC_KEY": "your-sync-key-here"
      }
    }
  }
}`}</CodeBlock>
          </div>
        </div>

        <hr className="border-border" />

        {/* Usage examples */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Once connected</h2>
          <p className="text-sm text-muted-foreground">Things worth asking your assistant:</p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>&ldquo;Search for climbing crags near Munich&rdquo;</li>
            <li>&ldquo;What&apos;s the rock type at Frankenjura?&rdquo;</li>
            <li>&ldquo;Find crags within 10km of 49.7, 11.3&rdquo;</li>
            <li>&ldquo;Show me recent condition reports for Frankenjura&rdquo;</li>
            <li>&ldquo;Are there any safety reports for this crag?&rdquo;</li>
          </ul>
        </div>

        <hr className="border-border" />

        {/* Tools */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Tools</h2>
            <p className="text-sm text-muted-foreground">
              Six tools, five of them read-only.
            </p>
          </div>

          {TOOLS.map((tool) => (
            <div key={tool.name} className="space-y-2 rounded border border-border p-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <code className="text-sm font-semibold text-orange-500">{tool.name}</code>
                <span className="text-xs text-muted-foreground">{tool.title}</span>
              </div>
              <p className="text-sm text-muted-foreground">{tool.description}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 pr-4 text-muted-foreground font-medium">Parameter</th>
                      <th className="pb-2 pr-4 text-muted-foreground font-medium">Type</th>
                      <th className="pb-2 text-muted-foreground font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {tool.params.map((param) => (
                      <tr key={param.name} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-mono whitespace-nowrap">
                          {param.name}
                          {param.required && <span className="text-orange-500" aria-hidden="true">*</span>}
                          {param.required && <span className="sr-only"> (required)</span>}
                        </td>
                        <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">{param.type}</td>
                        <td className="py-2">{param.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <p className="text-xs text-muted-foreground">
            <span className="text-orange-500">*</span> required
          </p>
        </div>

        <hr className="border-border" />

        {/* Categories */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Report categories</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <code key={category} className="text-xs bg-muted px-2 py-1 rounded">
                {category}
              </code>
            ))}
          </div>
        </div>

        {/* Sync key */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Sync keys</h2>
          <p className="text-sm text-muted-foreground">
            A sync key identifies a beta.rocks profile without an email or password. Users find theirs
            in the app under Settings, and{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">submit_report</code> uses it to
            attribute the report to them. It is hashed server-side and never stored in plaintext.
          </p>
          <p className="text-sm text-muted-foreground">
            Treat it as a credential: ask the user for their own key rather than sharing one, and
            don&apos;t log it.
          </p>
        </div>

        {/* Footer */}
        <div className="pt-6 text-center text-xs text-muted-foreground">
          <p>
            Built with care by{" "}
            <a href="https://beta.rocks" className="underline underline-offset-2 hover:text-foreground transition-colors">
              beta.rocks
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
