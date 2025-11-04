# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

beta.rocks is a free, chat-first web app that helps climbers get the beta on any crag worldwide. It uses AI (Google Gemini 2.5 Flash via Vercel AI SDK) to provide real-time conditions, community reports, and route information based on weather data, rock type, and climbing-specific factors. Features include user profiles with multi-device sync, chat history persistence, favorites bookmarking, and community reports with categories.

**Key Technologies:**

- Next.js 16 (App Router with Turbopack)
- TypeScript with strict mode
- Tailwind CSS 4 + shadcn/ui components
- Supabase (PostgreSQL database with RLS)
- Vercel AI SDK (streaming chat with tools)
- i18next for internationalization (17 locales)
- OpenBeta GraphQL API (climbing database)
- Open-Meteo API (weather data)
- QR code generation for sync keys

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
- `SUPABASE_SECRET_KEY` - Supabase service_role secret (optional, only for admin scripts like `enrich-countries.ts`)

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

### Enhanced Search with Sectors

**Feature**: Quick search (⌘K) that finds both crags and sectors

- SearchDialog now searches both crags and sectors using `search_locations_enhanced()` function
- Sectors display as "Sector Name • Parent Crag" (e.g., "Apremont • Fontainebleau")
- Fuzzy matching with trigram similarity for typo tolerance
- Results sorted by match score (exact > prefix > contains > fuzzy > location)
- Clicking a sector navigates to its parent crag page
- Particularly useful for areas like Fontainebleau with many named sectors

**Key Files**:

- `src/app/api/search/route.ts`: Search API endpoint
- `src/components/dialogs/SearchDialog.tsx`: ⌘K search interface
- Migration: `supabase/migrations/20251104101753_add_enhanced_search_with_sectors.sql`

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

### Component Structure

**Main Components** (src/components/):

- `ChatInterface.tsx`: Primary chat UI with Vercel AI SDK's `useChat` hook, integrated with chat history and sync
- `CragPageContent.tsx`: Rich detail view for crag pages with conditions, reports, sectors, maps
- `ConditionsDetailSheet.tsx`: Sheet-based detail view with weather analysis, charts, hourly forecasts
- `DisambiguationOptions.tsx`: Renders location options when multiple matches found
- `WeatherConditionCard.tsx`: Compact card showing current conditions with friction rating and favorite toggle
- `ReportCard.tsx`: Display community reports with category badges and voting
- `ReportDialog.tsx`: Multi-category report submission form
- `FavoritesDialog.tsx`: User's favorited crags with cached conditions
- `SettingsDialog.tsx`: User profile, sync key management, display name editor
- `Header.tsx`: App header with sync status and user menu
- `LanguageSelector.tsx`: I18n language switcher
- `ConfirmDialog.tsx`: Generic confirmation dialog for destructive actions

**shadcn/ui Components** (src/components/ui/): Pre-built, customizable components from shadcn/ui library

### Data Layer

**OpenBeta Client** (src/lib/openbeta/client.ts):

- GraphQL client for OpenBeta climbing database
- Provides `searchAreas()`, `getAreaByUuid()`, `formatAreaPath()`
- Helper functions: `isCrag()` checks if area has climbs/sectors vs being a region, `hasPreciseCoordinates()` filters out generic country-level coords, `extractRockType()` parses description for rock type

**External APIs** (src/lib/external-apis/):

- `open-meteo.ts`: Fetches 14-day weather forecast with hourly data
- `geocoding.ts`: Fallback location search when OpenBeta doesn't find a crag

**Country Utilities** (src/lib/utils/country-flags.ts):

- `getCountryFlag()`: Converts country name or ISO code to flag emoji
- `getCountryFlagWithFallback()`: Returns flag emoji or 🏔️ if not found
- `getCountryName()`: Converts ISO 3166-1 alpha-2 code to full country name
- Centralized mapping of 80+ countries with their ISO codes
- Used for metadata generation and location display

**Database** (src/lib/db/queries.ts):

- Supabase queries for user profiles, favorites, reports, confirmations, chat history
- Complete CRUD operations with RLS policies for security
- Anonymous user support via sync_key_hash lookups
- Optimized with indexes on frequently queried columns

**Database Schema** (see migrations in `supabase/migrations/`):

- `user_profiles`: User identity with sync_key_hash, display_name
- `user_stats`: Aggregate statistics (reports posted, confirmations given, favorites count)
- `user_favorites`: Bookmarked crags with cached conditions
- `chat_sessions`: Conversation sessions with titles
- `chat_messages`: Individual chat messages with tool invocations
- `reports`: Community reports with category, ratings, and text
- `confirmations`: User confirmations/votes on reports
- `crags`, `sectors`, `routes`: Climbing area data from OpenBeta

### Internationalization (i18n)

- 17 supported locales defined in `src/lib/i18n/config.ts`
- Translation files in `public/locales/{locale}/common.json`
- Client-side: `useClientTranslation` hook for React components
- Server-side: `resolveLocale()` for API routes
- Locale detection via browser headers, stored in cookies via middleware
- Special multilingual handling for Switzerland (de-CH, fr-CH, it-CH) based on browser language preference

**Adding Translations**:

1. Add key to `public/locales/en/common.json` (source of truth)
2. Add to all other locale files
3. Use `matchLocale()` for region-specific fallback (e.g., `en-US` → `en`)

### API Routes (src/app/api/)

- `chat/route.ts`: Main streaming chat endpoint with tool calling
- `conditions/route.ts`: Direct conditions API (bypasses chat)
- `reports/route.ts`: Community condition reports with category support
- `confirmations/route.ts`: Report confirmations/voting

### Dynamic Routes (src/app/)

- `location/[slug]/page.tsx`: Crag detail pages with ISR (5-minute revalidation)
  - Slug-based lookup (name or coordinates)
  - Server-side conditions calculation
  - Reports list with category filtering
  - Sector information display
  - Map embeds and external links
- `sync/page.tsx`: Sync key restoration page for secondary devices

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

- No automated tests yet (consider adding Jest + React Testing Library)
- Weather data limited to 14 days (Open-Meteo free tier)
- No email/password authentication - relies on sync keys only
- QR code sync requires manual key entry on device (no camera scanning yet)

## Deployment

Deployed on Vercel. On push to main:

1. Vercel auto-builds with Turbopack
2. Environment variables set in Vercel dashboard
3. Edge functions for API routes
4. Automatic HTTPS, caching, geo-distribution

See [Vercel docs](https://vercel.com/docs) for advanced configuration.
