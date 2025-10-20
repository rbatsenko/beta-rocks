# AGENTS.md

Guidance for AI coding agents working in this repository. Adapted from CLAUDE.md and tailored for agent workflows (e.g., Codex CLI).

## Project Overview

temps.rocks is a free, chat-first web app that helps climbers check real-time conditions at crags, sectors, and routes worldwide. It uses AI (Gemini 2.5 Flash via Vercel AI SDK) to analyze conditions based on weather, rock type, and climbing-specific factors.

Key technologies:

- Next.js 15 (App Router, Turbopack)
- TypeScript (strict mode)
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL)
- Vercel AI SDK (streaming chat + tools)
- i18next (12 locales)
- OpenBeta GraphQL API (climbing database)
- Open-Meteo API (weather data)

## Development

Run the app:

```bash
npm run dev           # Turbopack (default)
npm run dev:webpack   # Fallback if Turbopack issues
npm run build         # Production build
npm start             # Start production server
```

Code quality:

```bash
npm run lint          # ESLint
npm run lint:fix      # ESLint with fixes
npm run format        # Prettier write
npm run format:check  # Prettier check only
npm run type-check    # TypeScript type-check
```

Environment setup:

- Copy `.env.example` to `.env.local` and fill values.
- Required keys:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `GOOGLE_GENERATIVE_AI_API_KEY` (server-side only)
- Do not commit secrets. `.env` may exist for local convenience; prefer `.env.local` for Next.js.

## Code Architecture

### Core AI Chat Flow (`src/app/api/chat/route.ts`)

Uses Vercel AI SDK `streamText` with tool calling.

1. Tool `get_conditions` (primary):
   - Searches OpenBeta first (precise crag filtering via `isCrag()` + `hasPreciseCoordinates()`).
   - Disambiguates if multiple matches; otherwise resolves coordinates and rock type.
   - Falls back to geocoding when OpenBeta has no precise crag.
   - Fetches 14-day weather from Open-Meteo.
   - Computes friction and condition details via `computeConditions` service.

2. Location resolution priority:
   - OpenBeta GraphQL → single precise crag → use directly
   - Multiple OpenBeta matches → return disambiguation
   - No OpenBeta match → Geocoding fallback (+ disambiguation when needed)

3. Disambiguation payload (shape):

```ts
{
  disambiguate: true,
  source: "openbeta" | "geocoding",
  message: string,
  translationKey: string,
  options: [{ id, name, location, latitude, longitude, rockType? }]
}
```

### Climbing Conditions Service (`src/lib/conditions/conditions.service.ts`)

Computes friction scores (1–5) considering:

- Rock type (granite, sandstone, limestone, etc.) with distinct optimal ranges
- Temperature and humidity relative to rock-specific bands
- Recent precipitation with weather-aware drying (`calculateWeatherAwareDryingPenalty`)
- Wind speed effects on drying/safety
- Dew point spread for condensation risk

Key functions:

- `computeConditions()` – main entry, returns current + hourly forecast analysis
- `computeHourlyConditions()` – next 48h breakdown
- `findOptimalWindowsEnhanced()` – groups good hours into climb windows

Rock-type guidance:

- Sandstone: slow drying (~36h), can be structurally weak when wet
- Granite/Gneiss: fast drying (~2h), prefers cold/low humidity
- Limestone: moderate drying, more humidity-tolerant

### Components (`src/components/`)

- `ChatInterface.tsx` – main chat UI using `useChat`
- `ConditionsDetailDialog.tsx` – detailed analysis, charts, hourly forecasts
- `DisambiguationOptions.tsx` – renders selectable options for ambiguous locations
- `WeatherConditionCard.tsx` – compact current conditions display
- `LanguageSelector.tsx` – locale switcher
- `components/ui/` – shadcn/ui components

### Data Layer

- OpenBeta client (`src/lib/openbeta/client.ts`): `searchAreas`, `getAreaByUuid`, `formatAreaPath`, helpers `isCrag`, `hasPreciseCoordinates`, `extractRockType`.
- External APIs (`src/lib/external-apis/`): `open-meteo.ts` (forecast), `geocoding.ts` (fallback search).
- Database (`src/lib/db/queries.ts`): Supabase queries for reports/confirmations (partially implemented). See `docs/SUPABASE_SETUP.md`.

### Internationalization (i18n)

- 12 locales in `src/lib/i18n/config.ts` and `public/locales/{locale}/common.json`.
- Client: `useClientTranslation` hook.
- Server: `resolveLocale()` utility.
- Middleware sets cookie using Vercel geo headers.

Add translations:

1. Add key to `public/locales/en/common.json`.
2. Propagate to other locale files.
3. Use `matchLocale()` for region fallbacks.

### API Routes (`src/app/api/`)

- `chat/route.ts` – streaming chat endpoint with tools
- `conditions/route.ts` – direct conditions API
- `sync/[key]/route.ts` – multi-device sync (stub)
- `reports/route.ts` – community reports
- `confirmations/route.ts` – report confirmations

## Important Patterns & Conventions

- Tool-calling (Vercel AI SDK): tools return structured data; UI generates content from it.
- Type safety: strict TS, `noUnusedLocals`, `noUnusedParameters`; Zod schemas for tool inputs; OpenBeta types in `src/lib/openbeta/types.ts`.
- Path aliases: import from `@/*` for `src/*`.
- Middleware: `src/middleware.ts` handles geo-based locale defaults.
- Git: conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`); lowercase subject, e.g., `fix: correct friction calculation`.
- Formatting: Prettier config in `.prettierrc` (printWidth 100, semi true, double quotes).
- Linting: Next core-web-vitals + TypeScript via `eslint.config.mjs`.

Agent guidance (do/don’t):

- Do make minimal, focused changes aligned with existing patterns.
- Do update types, i18n keys, and docs when touching APIs/UX.
- Do prefer small utilities over large refactors unless requested.
- Don’t add new dependencies without clear need and alignment.
- Don’t commit secrets; keep environment values in `.env.local`.

## Local Testing Checklist

1. `npm install` then `npm run dev`.
2. Ask the chat: “What are conditions at El Cap?” or “How’s the weather at Fontainebleau?”
3. Validate disambiguation by trying “Smith Rock”.
4. Switch languages in the UI (LanguageSelector) and verify translations.

## Known Limitations

- Community reports/confirmations not fully wired to DB.
- Multi-device sync is stubbed.
- No automated tests yet (consider Jest + React Testing Library).
- Weather limited to 14 days (Open-Meteo free tier).

## Deployment

Hosted on Vercel. On push to `main`:

1. Vercel auto-builds with Turbopack.
2. Environment variables configured in Vercel dashboard.
3. Edge runtime for API routes.
4. HTTPS, caching, and geo-distribution handled by Vercel.

## Repo-wide Scope

This AGENTS.md applies to the entire repository. If a more specific AGENTS.md appears in a subdirectory, that one takes precedence within its folder tree.
