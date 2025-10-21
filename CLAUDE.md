# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

temps.rocks is a free, chat-first web app that helps climbers check real-time conditions at crags, sectors, and routes worldwide. It uses AI (Google Gemini 2.5 Flash via Vercel AI SDK) to provide intelligent climbing condition analysis based on weather data, rock type, and climbing-specific factors.

**Key Technologies:**

- Next.js 15 (App Router with Turbopack)
- TypeScript with strict mode
- Tailwind CSS + shadcn/ui components
- Supabase (PostgreSQL database)
- Vercel AI SDK (streaming chat with tools)
- i18next for internationalization (14 locales)
- OpenBeta GraphQL API (climbing database)
- Open-Meteo API (weather data)

## Development Commands

### Running the App

```bash
# Start dev server (uses Turbopack by default)
npm run dev

# Start dev server with Webpack (if Turbopack issues)
npm run dev:webpack

# Production build
npm run build

# Start production server
npm start
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Auto-fix ESLint issues
npm run lint:fix

# Check formatting with Prettier
npm run format:check

# Auto-format code with Prettier
npm run format

# Type-check without emitting files
npm run type-check
```

### Environment Setup

Copy `.env.example` to `.env.local` and add:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google AI API key (server-side only)

## Code Architecture

### Core AI Chat Flow (src/app/api/chat/route.ts)

The chat interface uses Vercel AI SDK's `streamText` with tools pattern:

1. **get_conditions tool**: Main tool for fetching climbing conditions
   - Tries OpenBeta API first (climbing-specific database with rock type data)
   - Falls back to geocoding API if OpenBeta doesn't find precise crag
   - Returns disambiguation options if multiple locations match
   - Fetches 14-day weather forecast from Open-Meteo
   - Computes friction scores using `computeConditions` service

2. **Location Resolution Priority**:
   - OpenBeta GraphQL → filters to actual crags with precise coordinates → single match used directly
   - Multiple OpenBeta matches → disambiguation dialog
   - No OpenBeta match → Geocoding API fallback → disambiguation if multiple results
   - The `isCrag()` and `hasPreciseCoordinates()` functions filter out regions/countries

3. **Disambiguation Pattern**: When multiple locations match, the tool returns:
   ```typescript
   {
     disambiguate: true,
     source: "openbeta" | "geocoding",
     message: "Found multiple...",
     translationKey: "disambiguation.foundMultipleAreas",
     options: [{ id, name, location, latitude, longitude, rockType? }]
   }
   ```
   The UI (DisambiguationOptions component) renders these as clickable cards that refine the search.

### Climbing Conditions Service (src/lib/conditions/conditions.service.ts)

**Core Algorithm**: Calculates friction scores (1-5 scale) based on:

- **Rock type** (granite, sandstone, limestone, etc.) - each has different optimal temp/humidity ranges
- **Temperature** - compared to rock-specific optimal ranges
- **Humidity** - critical for friction; sandstone is very sensitive
- **Recent precipitation** - with weather-aware drying calculation
- **Wind speed** - affects safety and drying
- **Dew point spread** - risk of condensation

**Key Functions**:

- `computeConditions()`: Main entry point, returns current conditions + hourly forecast
- `computeHourlyConditions()`: Analyzes next 48 hours for friction scores
- `findOptimalWindowsEnhanced()`: Groups consecutive good hours into climbing windows
- `calculateWeatherAwareDryingPenalty()`: Smart wetness penalty that considers current weather (temp, humidity, wind affect drying speed)

**Important**: Rock types have vastly different characteristics:

- **Sandstone**: Requires long drying time (36h), becomes structurally weak when wet (dangerous to climb)
- **Granite/Gneiss**: Fast drying (2h), performs well in cold temps, low humidity preferred
- **Limestone**: More humidity-tolerant, moderate drying time

### Component Structure

**Main Components** (src/components/):

- `ChatInterface.tsx`: Primary chat UI with Vercel AI SDK's `useChat` hook
- `ConditionsDetailDialog.tsx`: Large modal showing detailed weather analysis, charts (recharts), hourly forecasts
- `DisambiguationOptions.tsx`: Renders location options when multiple matches found
- `WeatherConditionCard.tsx`: Compact card showing current conditions with friction rating
- `LanguageSelector.tsx`: I18n language switcher

**shadcn/ui Components** (src/components/ui/): Pre-built, customizable components from shadcn/ui library

### Data Layer

**OpenBeta Client** (src/lib/openbeta/client.ts):

- GraphQL client for OpenBeta climbing database
- Provides `searchAreas()`, `getAreaByUuid()`, `formatAreaPath()`
- Helper functions: `isCrag()` checks if area has climbs/sectors vs being a region, `hasPreciseCoordinates()` filters out generic country-level coords, `extractRockType()` parses description for rock type

**External APIs** (src/lib/external-apis/):

- `open-meteo.ts`: Fetches 14-day weather forecast with hourly data
- `geocoding.ts`: Fallback location search when OpenBeta doesn't find a crag

**Database** (src/lib/db/queries.ts):

- Supabase queries for user reports, confirmations (TODO: not fully implemented)
- See `docs/SUPABASE_SETUP.md` for schema

### Internationalization (i18n)

- 14 supported locales defined in `src/lib/i18n/config.ts`
- Translation files in `public/locales/{locale}/common.json`
- Client-side: `useClientTranslation` hook for React components
- Server-side: `resolveLocale()` for API routes
- Locale detection via browser headers, stored in cookies via middleware

**Adding Translations**:

1. Add key to `public/locales/en/common.json` (source of truth)
2. Add to all other locale files
3. Use `matchLocale()` for region-specific fallback (e.g., `en-US` → `en`)

### API Routes (src/app/api/)

- `chat/route.ts`: Main streaming chat endpoint with tool calling
- `conditions/route.ts`: Direct conditions API (bypasses chat)
- `sync/[key]/route.ts`: Multi-device sync (not yet implemented)
- `reports/route.ts`: Community condition reports
- `confirmations/route.ts`: Report confirmations

## Important Patterns

### Tool Calling with Vercel AI SDK

The chat uses the single-step tool pattern (default behavior for fast responses). Tools return structured data, then the LLM generates natural language response. The UI components (via ai-elements) automatically render tool results with proper formatting.

### Type Safety

- Strict TypeScript mode enabled
- `noUnusedLocals` and `noUnusedParameters` enforced
- Zod schemas for API validation (see tool definitions in chat/route.ts)
- OpenBeta types defined in `src/lib/openbeta/types.ts`

### Path Aliases

Use `@/*` to import from `src/`:

```typescript
import { computeConditions } from "@/lib/conditions/conditions.service";
```

### Middleware (src/middleware.ts)

Detects user's country via Vercel geo headers, sets cookie for i18n auto-detection.

### Git Conventions

Follow conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, etc.
First letter after type is lowercase: `fix: correct friction calculation` (not `fix: Correct...`)

## Testing the App Locally

1. Install dependencies: `npm install`
2. Set up `.env.local` with Supabase credentials and Google AI API key
3. Run dev server: `npm run dev`
4. Test chat by asking: "What are conditions at El Cap?" or "How's the weather at Fontainebleau?"
5. Check that disambiguation works by searching ambiguous names like "Smith Rock"
6. Verify i18n by changing language in UI

## Known Limitations

- Community reports (add_report, confirm_report tools) not fully implemented in database
- Multi-device sync feature stubbed but not functional
- No automated tests yet (consider adding Jest + React Testing Library)
- Weather data limited to 14 days (Open-Meteo free tier)

## Deployment

Deployed on Vercel. On push to main:

1. Vercel auto-builds with Turbopack
2. Environment variables set in Vercel dashboard
3. Edge functions for API routes
4. Automatic HTTPS, caching, geo-distribution

See [Vercel docs](https://vercel.com/docs) for advanced configuration.
