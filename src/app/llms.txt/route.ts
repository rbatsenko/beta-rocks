export async function GET() {
  const content = `# beta.rocks

> Climbing conditions, weather, and community reports for any crag worldwide.

beta.rocks helps climbers find real-time weather conditions and community reports for climbing areas globally. It provides an open public API for programmatic access.

## API Documentation

- [API Docs](https://beta.rocks/docs/api): Interactive API documentation
- [Full API Reference](https://beta.rocks/llms-full.txt): Complete API reference in plain text (LLM-friendly)

## API Base URL

https://beta.rocks/api/v1

## Endpoints

- GET /api/v1/crags/search?q={query} - Search crags by name
- GET /api/v1/crags/{id} - Get crag detail with sectors
- GET /api/v1/crags/nearby?lat={lat}&lon={lon} - Find crags near coordinates
- GET /api/v1/crags/{id}/conditions - Get weather, condition flags, dry windows, and warnings for a crag
- GET /api/v1/crags/{id}/reports - Get community reports for a crag
- POST /api/v1/reports - Submit a community report (requires sync_key)
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
