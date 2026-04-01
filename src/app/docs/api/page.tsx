import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Documentation - beta.rocks",
  description: "Public API v1 documentation for beta.rocks - search crags, get conditions, and submit community reports.",
};

function Endpoint({
  method,
  path,
  description,
  children,
}: {
  method: "GET" | "POST";
  path: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-b border-border">
        <span
          className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
            method === "GET"
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-blue-500/20 text-blue-400"
          }`}
        >
          {method}
        </span>
        <code className="text-sm font-mono text-foreground">{path}</code>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-muted-foreground text-sm">{description}</p>
        {children}
      </div>
    </div>
  );
}

function ParamTable({ params }: { params: { name: string; type: string; required: boolean; description: string }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2 pr-4 text-muted-foreground font-medium">Parameter</th>
            <th className="pb-2 pr-4 text-muted-foreground font-medium">Type</th>
            <th className="pb-2 pr-4 text-muted-foreground font-medium">Required</th>
            <th className="pb-2 text-muted-foreground font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={p.name} className="border-b border-border/50">
              <td className="py-2 pr-4 font-mono text-xs">{p.name}</td>
              <td className="py-2 pr-4 text-muted-foreground">{p.type}</td>
              <td className="py-2 pr-4">{p.required ? <span className="text-amber-400 text-xs">required</span> : <span className="text-muted-foreground text-xs">optional</span>}</td>
              <td className="py-2 text-muted-foreground">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="rounded-md overflow-hidden border border-border">
      {title && (
        <div className="px-3 py-1.5 bg-muted/50 border-b border-border text-xs text-muted-foreground">
          {title}
        </div>
      )}
      <pre className="p-3 bg-muted/30 overflow-x-auto text-xs leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        {/* Header */}
        <div className="space-y-3">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">&larr; Back to beta.rocks</a>
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
            that identifies a beta.rocks user. Every user gets a sync key automatically when they first use the app. It&apos;s used for multi-device sync and anonymous identity (no email or password needed).
            You can find your sync key in the app under Settings &rarr; Sync.
          </p>
          <p className="text-sm text-muted-foreground">
            When building an integration, your app should ask users for their beta.rocks sync key to submit reports on their behalf.
            The sync key is hashed server-side and never stored in plaintext.
          </p>
        </div>

        <hr className="border-border" />

        {/* Endpoints */}
        <div className="space-y-8">
          <h2 className="text-xl font-semibold">Endpoints</h2>

          {/* Search Crags */}
          <Endpoint method="GET" path="/api/v1/crags/search" description="Search crags by name for autocomplete.">
            <ParamTable
              params={[
                { name: "q", type: "string", required: true, description: "Search term (min 2 characters)" },
                { name: "limit", type: "number", required: false, description: "Max results (default 10, max 10)" },
              ]}
            />
            <CodeBlock title="Example request">
              {`curl "https://beta.rocks/api/v1/crags/search?q=frankenjura&limit=5"`}
            </CodeBlock>
            <CodeBlock title="Response">
              {`{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Frankenjura",
      "slug": "frankenjura",
      "country": "Germany",
      "state": "Bavaria",
      "municipality": null,
      "village": null,
      "lat": 49.7,
      "lon": 11.3,
      "rock_type": "limestone",
      "climbing_types": ["sport", "boulder"],
      "match_score": 1.0
    }
  ]
}`}
            </CodeBlock>
          </Endpoint>

          {/* Get Crag */}
          <Endpoint method="GET" path="/api/v1/crags/:id" description="Get crag detail by ID, including sectors.">
            <CodeBlock title="Example request">
              {`curl "https://beta.rocks/api/v1/crags/a1b2c3d4-e5f6-7890-abcd-ef1234567890"`}
            </CodeBlock>
            <CodeBlock title="Response">
              {`{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Frankenjura",
    "slug": "frankenjura",
    "country": "Germany",
    "state": "Bavaria",
    "municipality": null,
    "village": null,
    "lat": 49.7,
    "lon": 11.3,
    "rock_type": "limestone",
    "climbing_types": ["sport"],
    "aspects": [180, 200],
    "description": "Large limestone area in Bavaria",
    "sectors": [
      { "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901", "name": "Sector A", "slug": "sector-a" }
    ]
  }
}`}
            </CodeBlock>
          </Endpoint>

          {/* Nearby Crags */}
          <Endpoint method="GET" path="/api/v1/crags/nearby" description="Find crags near coordinates.">
            <ParamTable
              params={[
                { name: "lat", type: "number", required: true, description: "Latitude" },
                { name: "lon", type: "number", required: true, description: "Longitude" },
                { name: "radius", type: "number", required: false, description: "Radius in meters (default 5000, max 50000)" },
                { name: "limit", type: "number", required: false, description: "Max results (default 10, max 10)" },
              ]}
            />
            <CodeBlock title="Example request">
              {`curl "https://beta.rocks/api/v1/crags/nearby?lat=49.7&lon=11.3&radius=10000"`}
            </CodeBlock>
            <CodeBlock title="Response">
              {`{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Frankenjura",
      "slug": "frankenjura",
      "lat": 49.7,
      "lon": 11.3,
      "distance_meters": 1234
    }
  ]
}`}
            </CodeBlock>
          </Endpoint>

          {/* Crag Reports */}
          <Endpoint method="GET" path="/api/v1/crags/:id/reports" description="Get community reports for a crag.">
            <ParamTable
              params={[
                { name: "limit", type: "number", required: false, description: "Max results (default 20, max 100)" },
                { name: "offset", type: "number", required: false, description: "Pagination offset (default 0)" },
                { name: "category", type: "string", required: false, description: "Filter by category" },
              ]}
            />
            <p className="text-xs text-muted-foreground">
              Categories: <code className="bg-muted px-1 py-0.5 rounded">conditions</code>{" "}
              <code className="bg-muted px-1 py-0.5 rounded">safety</code>{" "}
              <code className="bg-muted px-1 py-0.5 rounded">access</code>{" "}
              <code className="bg-muted px-1 py-0.5 rounded">climbing_info</code>{" "}
              <code className="bg-muted px-1 py-0.5 rounded">facilities</code>{" "}
              <code className="bg-muted px-1 py-0.5 rounded">lost_found</code>{" "}
              <code className="bg-muted px-1 py-0.5 rounded">other</code>
            </p>
            <CodeBlock title="Example request">
              {`curl "https://beta.rocks/api/v1/crags/a1b2c3d4-e5f6-7890-abcd-ef1234567890/reports?category=conditions&limit=5"`}
            </CodeBlock>
            <CodeBlock title="Response">
              {`{
  "data": [
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "category": "conditions",
      "message": "Rock is dry, light wind",
      "rating": 4,
      "photo_url": null,
      "created_at": "2026-03-31T10:00:00Z",
      "display_name": "ClimberX",
      "confirmations_count": 3
    }
  ],
  "total": 42
}`}
            </CodeBlock>
          </Endpoint>

          {/* Submit Report */}
          <Endpoint method="POST" path="/api/v1/reports" description="Submit a new community report. Requires a sync_key for user attribution.">
            <ParamTable
              params={[
                { name: "crag_id", type: "string", required: true, description: "UUID of the crag" },
                { name: "category", type: "string", required: true, description: "Report category (see list above)" },
                { name: "message", type: "string", required: true, description: "Report text (max 2000 chars)" },
                { name: "rating", type: "number", required: false, description: "Rating 1-5 (dryness)" },
                { name: "sync_key", type: "string", required: true, description: "User sync key for attribution" },
                { name: "source", type: "string", required: false, description: "Source app identifier (e.g., 'climbingpartner')" },
              ]}
            />
            <CodeBlock title="Example request">
              {`curl -X POST "https://beta.rocks/api/v1/reports" \\
  -H "Content-Type: application/json" \\
  -d '{
    "crag_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "category": "conditions",
    "message": "Dry rock, perfect conditions",
    "rating": 5,
    "sync_key": "your-sync-key-here",
    "source": "climbingpartner"
  }'`}
            </CodeBlock>
            <CodeBlock title="Response (201 Created)">
              {`{
  "data": {
    "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
    "category": "conditions",
    "message": "Dry rock, perfect conditions",
    "rating": 5,
    "photo_url": null,
    "created_at": "2026-03-31T12:00:00Z",
    "display_name": "YourName",
    "confirmations_count": 0
  }
}`}
            </CodeBlock>
          </Endpoint>
        </div>

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

        {/* Footer */}
        <div className="pt-6 text-center text-xs text-muted-foreground">
          <p>Built with care by <a href="https://beta.rocks" className="underline underline-offset-2 hover:text-foreground transition-colors">beta.rocks</a></p>
        </div>
      </div>
    </div>
  );
}
