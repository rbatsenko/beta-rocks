# AGENTS.md

Guidance for AI coding agents working in this repository. Adapted from CLAUDE.md and tailored for agent workflows (e.g., Codex CLI).

## Project Overview

beta.rocks is a free, chat-first web app that helps climbers check real-time conditions at crags, sectors, and routes worldwide. It uses AI (Google Gemini 2.5 Flash via Vercel AI SDK) to analyze conditions based on weather, rock type, and climbing-specific factors. Features include user profiles with multi-device sync, chat history persistence, favorites bookmarking, and community reports with categories.

Key technologies:

- Next.js 16 (App Router, Turbopack)
- TypeScript (strict mode)
- Tailwind CSS 4 + shadcn/ui
- Supabase (PostgreSQL with RLS)
- Vercel AI SDK (streaming chat + tools)
- i18next (17 locales)
- OpenBeta GraphQL API (climbing database)
- Open-Meteo API (weather data)
- QR code generation for sync keys

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

### User Profiles & Sync System

**Architecture**: Offline-first with Supabase sync

- Anonymous user profiles created on first visit with unique sync keys
- Sync key = 16-character identifier for restoring profile on other devices
- LocalStorage for immediate persistence, Supabase for cross-device sync
- No account/email required - privacy-focused approach
- Sync status indicator in header (synced/syncing/offline)

**Key Files**:

- `src/lib/auth/sync-key.ts`: Sync key generation, validation, hashing
- `src/lib/auth/cookie-actions.ts`: Cookie management for user profile
- `src/hooks/useSyncStatus.ts`: React hook for sync state management
- `src/app/sync/page.tsx`: Sync restoration page for secondary devices
- `src/components/SyncNotification.tsx`: Dismissible banner alerting users to sync
- `src/components/SyncExplainerDialog.tsx`: Educational dialog about sync

### Chat History Persistence

**Feature**: Save and restore chat conversations across sessions

- Chat sessions stored in `chat_sessions` table with titles
- Individual messages stored in `chat_messages` table
- Automatic background sync to database when online
- LocalStorage fallback for offline usage
- Clear chat (current session) and clear history (all sessions) options

**Key Files**:

- `src/lib/chat/history.service.ts`: Chat history CRUD operations
- `src/hooks/useChatHistory.ts`: React hook integrating with Vercel AI SDK
- Migration: `supabase/migrations/20251028063433_add_chat_history.sql`

### Favorites System

**Feature**: Bookmark crags for quick access to conditions

- Heart icon on WeatherConditionCard and crag detail pages
- Favorites displayed on welcome screen with quick query buttons
- Cached friction scores and ratings for fast display
- Works with both database crags and external OpenBeta areas
- Syncs across devices via user profile

**Key Files**:

- `src/lib/storage/favorites.ts`: Favorites CRUD operations
- `src/components/FavoritesDialog.tsx`: Favorites list modal
- Migration: `supabase/migrations/20251028054257_add_user_favorites.sql`

### Reports System

**Feature**: Community-submitted reports with 6 categories

- **Categories**: conditions, safety, access, beta, facilities, other
- Condition ratings (1-5): dryness, wind, crowds (conditions category only)
- Category-specific placeholders and validation
- Helpful/unhelpful voting with user profile integration
- Filter tabs on crag pages to view reports by category

**Key Files**:

- `src/components/ReportDialog.tsx`: Multi-category report submission
- `src/components/ReportCard.tsx`: Report display with category badges
- Migration: `supabase/migrations/20251028135542_add_report_categories.sql`

### Components (`src/components/`)

- `ChatInterface.tsx` – main chat UI using `useChat`, integrated with chat history and sync
- `CragPageContent.tsx` – rich detail view for crag pages with conditions, reports, sectors, maps
- `ConditionsDetailSheet.tsx` – sheet-based detail view with weather analysis, charts, hourly forecasts
- `DisambiguationOptions.tsx` – renders location options when multiple matches found
- `WeatherConditionCard.tsx` – compact card showing current conditions with friction rating and favorite toggle
- `ReportCard.tsx` – display community reports with category badges and voting
- `ReportDialog.tsx` – multi-category report submission form
- `FavoritesDialog.tsx` – user's favorited crags with cached conditions
- `SettingsDialog.tsx` – user profile, sync key management, display name editor
- `Header.tsx` – app header with sync status and user menu
- `LanguageSelector.tsx` – i18n language switcher
- `ConfirmDialog.tsx` – generic confirmation dialog for destructive actions
- `components/ui/` – shadcn/ui components (pre-built, customizable)

### Data Layer

- **OpenBeta client** (`src/lib/openbeta/client.ts`): `searchAreas`, `getAreaByUuid`, `formatAreaPath`, helpers `isCrag`, `hasPreciseCoordinates`, `extractRockType`.
- **External APIs** (`src/lib/external-apis/`): `open-meteo.ts` (forecast), `geocoding.ts` (fallback search).
- **Database** (`src/lib/db/queries.ts`): Supabase queries for user profiles, favorites, reports, confirmations, chat history. Complete CRUD operations with RLS policies for security. Anonymous user support via sync_key_hash lookups. Optimized with indexes on frequently queried columns.
- **Database Schema** (see migrations in `supabase/migrations/`):
  - `user_profiles`: User identity with sync_key_hash, display_name
  - `user_stats`: Aggregate statistics (reports posted, confirmations given, favorites count)
  - `user_favorites`: Bookmarked crags with cached conditions
  - `chat_sessions`: Conversation sessions with titles
  - `chat_messages`: Individual chat messages with tool invocations
  - `reports`: Community reports with category, ratings, and text
  - `confirmations`: User confirmations/votes on reports
  - `crags`, `sectors`, `routes`: Climbing area data from OpenBeta

### Internationalization (i18n)

- 17 locales in `src/lib/i18n/config.ts` and `public/locales/{locale}/common.json`.
- Client: `useClientTranslation` hook for React components.
- Server: `resolveLocale()` for API routes.
- Locale detection via browser headers, stored in cookies via middleware.
- Special multilingual handling for Switzerland (de-CH, fr-CH, it-CH) based on browser language preference.

Add translations:

1. Add key to `public/locales/en/common.json` (source of truth).
2. Add to all other locale files.
3. Use `matchLocale()` for region-specific fallback (e.g., `en-US` → `en`).

### API Routes (`src/app/api/`)

- `chat/route.ts` – main streaming chat endpoint with tool calling
- `conditions/route.ts` – direct conditions API (bypasses chat)
- `reports/route.ts` – community condition reports with category support
- `confirmations/route.ts` – report confirmations/voting

### Dynamic Routes (`src/app/`)

- `location/[slug]/page.tsx` – crag detail pages with ISR (5-minute revalidation)
  - Slug-based lookup (name or coordinates)
  - Server-side conditions calculation
  - Reports list with category filtering
  - Sector information display
  - Map embeds and external links
- `sync/page.tsx` – sync key restoration page for secondary devices

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

- No automated tests yet (consider Jest + React Testing Library).
- Weather data limited to 14 days (Open-Meteo free tier).
- No email/password authentication - relies on sync keys only.
- QR code sync requires manual key entry on device (no camera scanning yet).

## Deployment

Hosted on Vercel. On push to `main`:

1. Vercel auto-builds with Turbopack.
2. Environment variables configured in Vercel dashboard.
3. Edge runtime for API routes.
4. HTTPS, caching, and geo-distribution handled by Vercel.

## Repo-wide Scope

This AGENTS.md applies to the entire repository. If a more specific AGENTS.md appears in a subdirectory, that one takes precedence within its folder tree.
