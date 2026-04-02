"use client";

import { useState } from "react";
import { ApiPlayground } from "./ApiPlayground";

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

function ExampleAndPlayground({
  example,
  playground,
}: {
  example: React.ReactNode;
  playground: React.ReactNode;
}) {
  const [tab, setTab] = useState<"example" | "try">("example");

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className="flex border-b border-border bg-muted/50">
        <button
          onClick={() => setTab("example")}
          className={`px-4 py-2 text-xs font-medium transition-colors ${
            tab === "example"
              ? "text-foreground border-b-2 border-foreground -mb-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Example
        </button>
        <button
          onClick={() => setTab("try")}
          className={`px-4 py-2 text-xs font-medium transition-colors ${
            tab === "try"
              ? "text-foreground border-b-2 border-foreground -mb-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Try it
        </button>
      </div>
      <div className="p-3">
        {tab === "example" ? example : playground}
      </div>
    </div>
  );
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="space-y-2">
      {title && <p className="text-xs text-muted-foreground">{title}</p>}
      <pre className="p-3 bg-muted/30 rounded overflow-x-auto text-xs leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export function ApiEndpoints() {
  return (
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
        <ExampleAndPlayground
          example={
            <div className="space-y-3">
              <CodeBlock title="Request">{`curl "https://beta.rocks/api/v1/crags/search?q=frankenjura&limit=5"`}</CodeBlock>
              <CodeBlock title="Response">{`{
  "data": [
    {
      "id": "osm_relation_17696060",
      "name": "Frankenjura",
      "slug": "frankenjura-3220",
      "country": "DE",
      "state": "Bayern",
      "lat": 49.833391,
      "lon": 11.2183103,
      "rock_type": "limestone",
      "climbing_types": [],
      "match_score": 0.9
    }
  ]
}`}</CodeBlock>
            </div>
          }
          playground={
            <ApiPlayground
              method="GET"
              fields={[
                { name: "q", label: "q", placeholder: "frankenjura", required: true, defaultValue: "frankenjura" },
                { name: "limit", label: "limit", placeholder: "10" },
              ]}
              buildUrl={(p) => {
                const params = new URLSearchParams();
                if (p.q) params.set("q", p.q);
                if (p.limit) params.set("limit", p.limit);
                return `/api/v1/crags/search?${params.toString()}`;
              }}
            />
          }
        />
      </Endpoint>

      {/* Get Crag */}
      <Endpoint method="GET" path="/api/v1/crags/:id" description="Get crag detail by ID, including sectors.">
        <ExampleAndPlayground
          example={
            <div className="space-y-3">
              <CodeBlock title="Request">{`curl "https://beta.rocks/api/v1/crags/osm_relation_17696060"`}</CodeBlock>
              <CodeBlock title="Response">{`{
  "data": {
    "id": "osm_relation_17696060",
    "name": "Frankenjura",
    "slug": "frankenjura-3220",
    "country": "DE",
    "state": "Bayern",
    "lat": 49.833391,
    "lon": 11.2183103,
    "rock_type": "limestone",
    "climbing_types": [],
    "aspects": [],
    "description": null,
    "sectors": []
  }
}`}</CodeBlock>
            </div>
          }
          playground={
            <ApiPlayground
              method="GET"
              fields={[
                { name: "id", label: "id", placeholder: "osm_relation_17696060", required: true, defaultValue: "osm_relation_17696060" },
              ]}
              buildUrl={(p) => `/api/v1/crags/${encodeURIComponent(p.id || "")}`}
            />
          }
        />
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
        <ExampleAndPlayground
          example={
            <div className="space-y-3">
              <CodeBlock title="Request">{`curl "https://beta.rocks/api/v1/crags/nearby?lat=49.7&lon=11.3&radius=10000"`}</CodeBlock>
              <CodeBlock title="Response">{`{
  "data": [
    {
      "id": "osm_node_433922853",
      "name": "Hartelstein",
      "slug": "hartelstein-2827",
      "lat": 49.6897636,
      "lon": 11.321171,
      "distance_meters": 1234
    }
  ]
}`}</CodeBlock>
            </div>
          }
          playground={
            <ApiPlayground
              method="GET"
              fields={[
                { name: "lat", label: "lat", placeholder: "49.7", required: true, defaultValue: "49.7" },
                { name: "lon", label: "lon", placeholder: "11.3", required: true, defaultValue: "11.3" },
                { name: "radius", label: "radius", placeholder: "5000" },
                { name: "limit", label: "limit", placeholder: "10" },
              ]}
              buildUrl={(p) => {
                const params = new URLSearchParams();
                if (p.lat) params.set("lat", p.lat);
                if (p.lon) params.set("lon", p.lon);
                if (p.radius) params.set("radius", p.radius);
                if (p.limit) params.set("limit", p.limit);
                return `/api/v1/crags/nearby?${params.toString()}`;
              }}
            />
          }
        />
      </Endpoint>

      {/* Crag Conditions */}
      <Endpoint method="GET" path="/api/v1/crags/:id/conditions" description="Get current weather and climbing conditions for a crag. Returns friction score (rough estimate), hourly forecast, and optimal climbing windows.">
        <ExampleAndPlayground
          example={
            <div className="space-y-3">
              <CodeBlock title="Request">{`curl "https://beta.rocks/api/v1/crags/osm_relation_17696060/conditions"`}</CodeBlock>
              <CodeBlock title="Response">{`{
  "data": {
    "crag": {
      "id": "osm_relation_17696060",
      "name": "Frankenjura",
      "rock_type": "limestone"
    },
    "current_weather": {
      "temperature_c": 18.5,
      "humidity": 55,
      "wind_speed_kph": 12,
      "wind_direction": 220,
      "precipitation_mm": 0
    },
    "conditions": {
      "label": "Good",
      "friction_score": 4,
      "note": "Friction score is a rough estimate...",
      "is_dry": true,
      "drying_time_hours": null,
      "dew_point_spread": 8.2,
      "precipitation": {
        "last_24h_mm": 0,
        "last_48h_mm": 2.1,
        "next_24h_mm": 0
      },
      "reasons": ["Good temperature for limestone", "Low humidity"],
      "warnings": [],
      "hourly_conditions": [...],
      "optimal_windows": [...]
    },
    "daily_forecast": [...],
    "updated_at": "2026-04-02T12:00:00Z"
  }
}`}</CodeBlock>
            </div>
          }
          playground={
            <ApiPlayground
              method="GET"
              fields={[
                { name: "id", label: "id", placeholder: "osm_relation_17696060", required: true, defaultValue: "osm_relation_17696060" },
              ]}
              buildUrl={(p) => `/api/v1/crags/${encodeURIComponent(p.id || "")}/conditions`}
            />
          }
        />
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
        <ExampleAndPlayground
          example={
            <div className="space-y-3">
              <CodeBlock title="Request">{`curl "https://beta.rocks/api/v1/crags/osm_relation_17696060/reports?category=conditions&limit=5"`}</CodeBlock>
              <CodeBlock title="Response">{`{
  "data": [
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "category": "conditions",
      "message": "Rock is dry, light wind",
      "rating_dry": 4,
      "rating_wind": 3,
      "rating_crowds": 5,
      "lost_found_type": null,
      "photos": [],
      "created_at": "2026-03-31T10:00:00Z",
      "display_name": "ClimberX",
      "confirmations_count": 3
    }
  ],
  "total": 42
}`}</CodeBlock>
            </div>
          }
          playground={
            <ApiPlayground
              method="GET"
              fields={[
                { name: "id", label: "id", placeholder: "osm_relation_17696060", required: true, defaultValue: "osm_relation_17696060" },
                { name: "limit", label: "limit", placeholder: "20" },
                { name: "offset", label: "offset", placeholder: "0" },
                { name: "category", label: "category", placeholder: "conditions" },
              ]}
              buildUrl={(p) => {
                const params = new URLSearchParams();
                if (p.limit) params.set("limit", p.limit);
                if (p.offset) params.set("offset", p.offset);
                if (p.category) params.set("category", p.category);
                return `/api/v1/crags/${encodeURIComponent(p.id || "")}/reports?${params.toString()}`;
              }}
            />
          }
        />
      </Endpoint>

      {/* Submit Report */}
      <Endpoint method="POST" path="/api/v1/reports" description="Submit a new community report. Requires a sync_key for user attribution.">
        <ParamTable
          params={[
            { name: "crag_id", type: "string", required: true, description: "UUID of the crag" },
            { name: "category", type: "string", required: true, description: "Report category (see list above)" },
            { name: "message", type: "string", required: true, description: "Report text (max 2000 chars)" },
            { name: "rating_dry", type: "number", required: false, description: "Dryness rating 1-5 (conditions only)" },
            { name: "rating_wind", type: "number", required: false, description: "Wind rating 1-5 (conditions only)" },
            { name: "rating_crowds", type: "number", required: false, description: "Crowds rating 1-5 (conditions only)" },
            { name: "lost_found_type", type: "string", required: false, description: "'lost' or 'found' (required for lost_found category)" },
            { name: "sync_key", type: "string", required: true, description: "User sync key for attribution" },
            { name: "source", type: "string", required: false, description: "Source app identifier (e.g., 'climbingpartner')" },
          ]}
        />
        <ExampleAndPlayground
          example={
            <div className="space-y-3">
              <CodeBlock title="Request">{`curl -X POST "https://beta.rocks/api/v1/reports" \\
  -H "Content-Type: application/json" \\
  -d '{
    "crag_id": "osm_relation_17696060",
    "category": "conditions",
    "message": "Dry rock, perfect conditions",
    "rating_dry": 5,
    "rating_wind": 3,
    "rating_crowds": 4,
    "sync_key": "your-sync-key-here",
    "source": "myapp"
  }'`}</CodeBlock>
              <CodeBlock title="Response (201 Created)">{`{
  "data": {
    "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
    "category": "conditions",
    "message": "Dry rock, perfect conditions",
    "rating_dry": 5,
    "rating_wind": 3,
    "rating_crowds": 4,
    "lost_found_type": null,
    "photos": [],
    "created_at": "2026-03-31T12:00:00Z",
    "display_name": "YourName",
    "confirmations_count": 0
  }
}`}</CodeBlock>
            </div>
          }
          playground={
            <ApiPlayground
              method="POST"
              fields={[]}
              bodyFields={[
                { name: "crag_id", label: "crag_id", placeholder: "osm_relation_17696060", required: true },
                { name: "category", label: "category", placeholder: "conditions", required: true },
                { name: "message", label: "message", placeholder: "Rock is dry, great conditions", required: true },
                { name: "rating_dry", label: "rating_dry", placeholder: "1-5" },
                { name: "rating_wind", label: "rating_wind", placeholder: "1-5" },
                { name: "rating_crowds", label: "rating_crowds", placeholder: "1-5" },
                { name: "lost_found_type", label: "lost_found_type", placeholder: "lost or found" },
                { name: "sync_key", label: "sync_key", placeholder: "your-sync-key", required: true },
                { name: "source", label: "source", placeholder: "myapp" },
              ]}
              buildUrl={() => `/api/v1/reports`}
            />
          }
        />
      </Endpoint>
    </div>
  );
}
