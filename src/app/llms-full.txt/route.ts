export async function GET() {
  const content = `# beta.rocks Public API v1 - Full Reference

> Climbing conditions, weather, and community reports for any crag worldwide.

Base URL: https://beta.rocks/api/v1

All endpoints return JSON. CORS is enabled for all origins.
Errors return: { "error": "Human-readable message" }

---

## GET /api/v1/crags/search

Search crags by name for autocomplete.

### Parameters

| Name  | Type   | Required | Description                    |
|-------|--------|----------|--------------------------------|
| q     | string | yes      | Search term (min 2 characters) |
| limit | number | no       | Max results (default 10, max 10) |

### Example

GET /api/v1/crags/search?q=frankenjura&limit=5

### Response

{
  "data": [
    {
      "id": "osm_relation_17696060",
      "name": "Frankenjura",
      "slug": "frankenjura-3220",
      "country": "DE",
      "state": "Bayern",
      "municipality": null,
      "village": null,
      "lat": 49.833391,
      "lon": 11.2183103,
      "rock_type": "limestone",
      "climbing_types": [],
      "match_score": 1.0
    }
  ]
}

---

## GET /api/v1/crags/{id}

Get crag detail by ID, including sectors.

### Parameters

| Name | Type   | Required | Description |
|------|--------|----------|-------------|
| id   | string | yes      | Crag ID (path parameter) |

### Example

GET /api/v1/crags/osm_relation_17696060

### Response

{
  "data": {
    "id": "osm_relation_17696060",
    "name": "Frankenjura",
    "slug": "frankenjura-3220",
    "country": "DE",
    "state": "Bayern",
    "municipality": null,
    "village": null,
    "lat": 49.833391,
    "lon": 11.2183103,
    "rock_type": "limestone",
    "climbing_types": [],
    "aspects": [],
    "description": null,
    "sectors": [
      { "id": "...", "name": "Sector A", "slug": "sector-a" }
    ]
  }
}

### Errors

- 404: Crag not found

---

## GET /api/v1/crags/nearby

Find crags near coordinates.

### Parameters

| Name   | Type   | Required | Description                              |
|--------|--------|----------|------------------------------------------|
| lat    | number | yes      | Latitude                                 |
| lon    | number | yes      | Longitude                                |
| radius | number | no       | Radius in meters (default 5000, max 50000) |
| limit  | number | no       | Max results (default 10, max 10)         |

### Example

GET /api/v1/crags/nearby?lat=49.7&lon=11.3&radius=10000

### Response

{
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
}

---

## GET /api/v1/crags/{id}/conditions

Get current weather and climbing conditions for a crag.

### Parameters

| Name | Type   | Required | Description |
|------|--------|----------|-------------|
| id   | string | yes      | Crag ID (path parameter) |

### Example

GET /api/v1/crags/osm_relation_17696060/conditions

### Response

{
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
      "note": "Friction score is a rough estimate based on weather, rock type, and recent precipitation.",
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
      "hourly_conditions": [
        {
          "time": "2026-04-02T12:00",
          "friction_score": 4,
          "temperature_c": 18.5,
          "humidity": 55,
          "wind_speed_kph": 12,
          "precipitation_mm": 0
        }
      ],
      "optimal_windows": [...]
    },
    "daily_forecast": [
      {
        "date": "2026-04-02",
        "temp_max_c": 22,
        "temp_min_c": 8,
        "precipitation_mm": 0,
        "wind_speed_max_kph": 15,
        "weather_code": 1,
        "sunrise": "06:45",
        "sunset": "19:30"
      }
    ],
    "updated_at": "2026-04-02T12:00:00Z"
  }
}

### Errors

- 400: Crag has no coordinates
- 404: Crag not found

---

## GET /api/v1/crags/{id}/reports

Get community reports for a crag.

### Parameters

| Name     | Type   | Required | Description                        |
|----------|--------|----------|------------------------------------|
| id       | string | yes      | Crag ID (path parameter)          |
| limit    | number | no       | Max results (default 20, max 100)  |
| offset   | number | no       | Pagination offset (default 0)      |
| category | string | no       | Filter by category (see below)     |

### Categories

conditions, safety, access, climbing_info, facilities, lost_found, other

### Example

GET /api/v1/crags/osm_relation_17696060/reports?category=conditions&limit=5

### Response

{
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
}

### Errors

- 400: Invalid pagination parameters or invalid category
- 404: Crag not found

---

## POST /api/v1/reports

Submit a new community report. Requires a sync_key for user attribution.

### Authentication

This endpoint requires a sync_key - a UUID that identifies a beta.rocks user.
Users create their profile and sync key in the beta.rocks app under Settings.
When building an integration, ask users for their beta.rocks sync key to submit reports on their behalf.

### Request Body (JSON)

| Name     | Type   | Required | Description                              |
|----------|--------|----------|------------------------------------------|
| crag_id         | string | yes      | ID of the crag                                        |
| category        | string | yes      | Report category (see categories above)                |
| message         | string | yes      | Report text (max 2000 chars)                          |
| rating_dry      | number | no       | Dryness rating 1-5 (conditions category)              |
| rating_wind     | number | no       | Wind rating 1-5 (conditions category)                 |
| rating_crowds   | number | no       | Crowds rating 1-5 (conditions category)               |
| lost_found_type | string | no       | "lost" or "found" (required for lost_found category)  |
| sync_key        | string | yes      | User sync key for attribution                         |
| source          | string | no       | Source app identifier (e.g., "myapp")                 |

### Example

POST /api/v1/reports
Content-Type: application/json

{
  "crag_id": "osm_relation_17696060",
  "category": "conditions",
  "message": "Dry rock, perfect conditions",
  "rating_dry": 5,
  "rating_wind": 3,
  "rating_crowds": 4,
  "sync_key": "your-sync-key-here",
  "source": "myapp"
}

### Response (201 Created)

{
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
}

### Errors

- 400: Missing or invalid parameters
- 401: Invalid sync_key
- 404: Crag not found

---

## Error Codes

| Status | Meaning                                      |
|--------|----------------------------------------------|
| 400    | Bad request - missing or invalid parameters  |
| 401    | Unauthorized - invalid sync_key              |
| 404    | Not found - crag does not exist              |
| 500    | Server error                                 |
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
