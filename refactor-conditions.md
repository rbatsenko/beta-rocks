# Refactor: Kill the Friction Score Oracle

## Context

beta.rocks is a climbing conditions platform with a backend (Next.js/Supabase), web app, mobile app (React Native), and an MCP server. The current conditions system takes weather station data and outputs a "friction score" (1-5) with a label like "Great". This is dishonest. We don't have a friction meter. We have weather data from a station that might be 20km from the crag. We cannot tell the user what the rock feels like.

We're ripping this out and replacing it with something honest: a **weather translator** that presents climbing-relevant weather data with clear risk flags, plain-language summaries, and zero fake precision. Community reports from actual climbers become the hero for real conditions data.

## Philosophy — read this before touching any code

1. **We are not an oracle.** We don't know what friction is like on the rock. We know what the weather is doing near the crag. Present that honestly.
2. **No scores pretending to synthesize reality into a single number.** A "5/5 friction" label gives people false confidence. A climber who gets shut down on greasy polished limestone despite our "Great" rating loses trust in the whole product.
3. **Community reports are the real conditions data.** A human who touched the rock today knows more than our algorithm ever will. Weather data is the supporting act.
4. **Plain language over abstraction.** Instead of "Great — friction 5/5", say what a climbing partner would text you: "Dry, bit humid, drizzle coming at 3. Go now if you can."
5. **Risk flags are binary and verifiable.** Either it rained in the last 24h or it didn't. Either the dew point spread is below 3°C or it isn't. No subjective scales.

## What to explore first

Before making changes, explore the full codebase to understand:

1. **Backend**: Find `conditions_service.ts` and all files that import from it. Trace how `computeConditions`, `computeHourlyConditions`, `computeHourlyFrictionScore`, `findOptimalWindowsEnhanced`, and `scoreToRating` are used. Find the API route(s) that serve conditions data and the MCP server endpoint.
2. **Web app**: Find every component that renders friction scores, ratings ("Great"/"Good"/"Fair"/"Poor"/"Nope"), optimal windows, or the conditions label. Search for `frictionScore`, `friction_score`, `frictionRating`, `friction_rating`, `rating`, `scoreToRating`, `isOptimal`, `optimalWindows`, `optimal_windows`. Look at how the conditions card/widget is structured.
3. **Mobile app**: Same search as web. Find the conditions UI components, any color coding tied to scores, any icons or badges tied to the rating system.
4. **MCP server**: Find how the conditions endpoint formats and returns data. This is what external consumers (including Claude) see.
5. **Supabase**: Check if friction scores or ratings are stored/cached in the database. Check if any database views, functions, or RPC calls reference them.

Map out every touchpoint before changing anything. Create a list of all files that need modification.

## What gets killed

- `frictionScore` / `friction_score` / `frictionRating` / `friction_rating` — everywhere, backend through frontend
- `rating: "Great" | "Good" | "Fair" | "Poor" | "Nope"` as a conditions label — gone from API responses and all UI
- `scoreToRating()` function — delete
- `computeHourlyFrictionScore()` — replace with flag computation per hour
- `isOptimal` boolean on hourly data — replace with flag-based assessment
- `optimal_windows` as scored windows — replace with dry weather windows
- Any UI color gradients, badges, or visual scales tied to the 1-5 score
- Any copy/strings in the UI that say "friction", "friction score", "conditions score", or present the rating labels

## New backend data model

Replace the conditions response with this structure. Adapt the TypeScript interfaces accordingly:

```typescript
interface WeatherResponse {
  crag: { id, name, slug, lat, lon, rock_type }

  weather: {
    now: {
      temp_c: number
      humidity: number
      dew_point_spread: number  // temp - dew point, rounded to 1 decimal
      wind_kph: number
      wind_direction: number
      precip_mm: number
      weather_code: number
    }
    hourly: Array<{
      time: string
      temp_c: number
      humidity: number
      dew_point_spread: number
      wind_kph: number
      wind_direction: number
      precip_mm: number
      weather_code: number
    }>
    daily: Array<{
      date: string
      temp_max_c: number
      temp_min_c: number
      precipitation_mm: number
      wind_speed_max_kph: number
      weather_code: number
      sunrise: string
      sunset: string
    }>
  }

  // Binary, verifiable risk flags
  flags: {
    rain_now: boolean
    rain_expected: { in_hours: number, mm: number } | null
    recent_rain: { last_24h_mm: number, last_48h_mm: number }
    condensation_risk: boolean        // dew point spread < 3°C
    high_humidity: boolean            // above rock-type-aware threshold
    wet_rock_likely: boolean          // recent precip + drying model estimate
    estimated_dry_by: string | null   // ISO time when rock should be dry, if currently wet
    sandstone_wet_warning: boolean    // special: don't climb wet sandstone, it damages the rock
    extreme_wind: boolean             // > 40 kph
    high_wind: boolean                // > 25 kph
  }

  // What a climbing partner would text you
  summary: string

  // Hours with no precip and no condensation risk, grouped into windows
  dry_windows: Array<{
    start: string   // ISO
    end: string     // ISO
    hours: number
  }>

  // Most recent community report for this crag (if any)
  latest_report: {
    message: string
    rating_dry: number | null
    rating_wind: number | null
    rating_crowds: number | null
    created_at: string
    display_name: string
    photos: string[]
  } | null

  precipitation: {
    last_24h_mm: number
    last_48h_mm: number
    next_24h_mm: number
  }

  updated_at: string
}
```

## Summary generation

The `summary` field is the most important UX element. It replaces the rating label. Rules:

- Write like a climbing partner texting you, not like a weather app
- Lead with the most actionable information
- Max 2 sentences
- Reference time windows when relevant
- Mention rock type concerns when applicable (sandstone + rain = don't go)
- Examples:
  - "Dry and cool, low humidity. Great sending weather all afternoon."
  - "Light drizzle expected around 15:00. Head out now for a dry window until then."
  - "Rained 5mm overnight. Limestone should be dry by early afternoon given the wind."
  - "High humidity and condensation risk all day. Rock will feel greasy."
  - "Sandstone is still wet from yesterday's rain. Give it another day."
  - "Dry but windy as hell. Fine for sheltered walls."

This should be generated by a simple rule-based function, NOT by an LLM call. Keep it deterministic and fast. Build it as a series of condition checks that assemble sentence fragments. The function should take the flags, weather data, rock type, and dry windows as inputs.

## What stays but gets reframed

- **Rock type awareness** — keep the `getRockTypeConditions` config, but use it ONLY for:
  - Drying time estimates (how long after rain until rock is dry)
  - Humidity thresholds (what counts as "high" varies by rock type)
  - The sandstone wet warning
  - Do NOT use it for scoring
- **Dew point calculation** — `calculateDewPoint()` stays, it's real physics
- **Drying model** — `calculateWeatherAwareDryingPenalty` gets refactored into `estimateDryingTime()` that returns hours until dry, not a penalty to subtract from a fake score
- **Precipitation context** — `calculatePrecipitationContext()` stays, it's useful
- **Daylight/climbing hours** — the daylight utils stay, used for filtering hourly data to relevant hours and for dry window computation

## Rock type thresholds to tighten

While refactoring, update these limestone values — current ones are too generous:

```typescript
limestone: {
  optimalTemp: { min: 10, max: 25 },
  humidityThreshold: 65,  // was 80 (maxHumidity), way too high
  dryingHours: 4,
}
```

Note: rename `optimalHumidity`/`maxHumidity` to just `humidityThreshold` — we're using it for the flag only, not for scoring.

## Frontend changes

### Information hierarchy (both web and mobile)

When a user views conditions for a crag, the display order should be:

1. **Latest community report** (if < 7 days old) — this is real data from a human on the rock. Show the message, ratings, photo if available, and age ("3 days ago"). This is the hero.
2. **Summary** — the plain-language weather summary. Prominent, readable.
3. **Active flags** — show only flags that are true. Use simple icons/pills: 🌧 Rain expected, 💧 Rock may be wet, 💨 High wind, etc. Don't show flags that are false.
4. **Dry windows** — "Dry weather windows: 09:00–14:00, 18:00–sunset"
5. **Hourly weather** — expandable/scrollable table or chart showing temp, humidity, dew point spread, wind, precip per hour. Raw data, no coloring by score.
6. **Daily forecast** — next 7 days overview

### What to remove from UI

- Any numeric score display (the big "5" or "4.2" or whatever)
- The "Great"/"Good"/"Fair"/"Poor"/"Nope" label and any associated color coding
- Any progress bars, gauges, or visual meters representing friction
- "Optimal" badges on hourly rows
- Any color gradient from red→green on hourly data based on friction score

### What to add/change in UI

- Flag pills/badges (only shown when active)
- The summary string displayed prominently
- Community report card elevated to top position
- Hourly weather as clean data table — temp, humidity, dew point spread, wind, precip columns. No score column.
- If no community report exists, show a CTA: "Be the first to report conditions"

## MCP server changes

Update the MCP endpoint that serves conditions to return the new structure. Update the tool description from "friction score (rough estimate)" to something like "climbing-relevant weather data with risk flags and community reports". The MCP response should match the new `WeatherResponse` interface.

## Migration / backwards compatibility

- This is a breaking change to the API response shape. Since we control all consumers (web, mobile, MCP), coordinate the change.
- Check if any cached/stored data in Supabase references the old friction scores. Clean up any stale cache entries.
- If there are any API consumers beyond our own apps, note them.

## Testing

After refactoring:
1. Call the conditions endpoint for a few crags and verify the response matches the new shape
2. Verify flags are correctly computed — especially `condensation_risk` (dew point spread < 3), `wet_rock_likely` (recent precip + drying model), and `rain_expected`
3. Verify the summary reads naturally for different weather scenarios
4. Verify dry windows correctly exclude hours with precip or condensation risk
5. Verify the sandstone wet warning triggers appropriately
6. Verify latest community report is included when available
7. Check web and mobile UIs render the new data correctly with no references to old friction scores remaining

## Order of operations

1. Explore the codebase — map all touchpoints
2. Refactor `conditions_service.ts` — new interfaces, flag computation, summary generation, dry windows, kill all scoring
3. Update the API route(s) / MCP endpoint to return new shape
4. Update web app components
5. Update mobile app components
6. Clean up any DB artifacts
7. Test end-to-end
