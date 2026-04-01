# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

beta.rocks is a free, chat-first web and mobile app that helps climbers get the beta on any crag worldwide. It uses AI (Google Gemini 2.5 Flash via Vercel AI SDK) to provide real-time conditions, community reports, and route information based on weather data, rock type, and climbing-specific factors. Features include user profiles with multi-device sync, chat history persistence, favorites bookmarking, community reports with categories, notifications, and webcams.

This is a **monorepo** with two apps:

- **Web app** (`src/`): Next.js 16 web application with AI chat
- **Mobile app** (`mobile/`): Expo/React Native app for iOS and Android

**Key Technologies (Web):**

- Next.js 16 (App Router with Turbopack)
- TypeScript with strict mode
- Tailwind CSS 4 + shadcn/ui components
- Supabase (PostgreSQL database with RLS)
- i18next for internationalization (30 locales)
- Open-Meteo API (weather data)
- Windy API (webcams)
- Resend (email for sync key delivery)

**Key Technologies (Mobile):**

- Expo 55 / React Native 0.83
- Expo Router (file-based routing)
- TypeScript with strict mode
- react-native-maps (interactive maps)
- react-native-mmkv (fast local storage)
- expo-secure-store (encrypted sync key storage)
- expo-notifications (push notifications)
- expo-image-picker (photo uploads)
- i18next (30 locales, shared translations with web)
- Same Supabase backend as web

## Development Commands

### Web App

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

### Mobile App

```bash
cd mobile

# Start Expo dev server
npm run start

# Run on Android device/emulator
npm run android

# Run on iOS simulator
npm run ios

# Run on web (React Native Web)
npm run web
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

# Generate Supabase TypeScript types
npm run db:types
```

### Environment Setup

**Web** — Copy `.env.example` to `.env.local` and add:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `SUPABASE_SECRET_KEY` - Supabase service_role secret (optional, for admin scripts)
- `RESEND_API_KEY` - Resend API key for email sync key delivery
- `WINDY_API_KEY` - Windy API key for webcam integration
- `NEXT_PUBLIC_DEBUG_RENDERS` - Enable render debugging (optional)

**Mobile** — Copy `mobile/.env.example` to `mobile/.env` and add:

- `EXPO_PUBLIC_API_URL` - Web app URL (e.g., `https://beta.rocks`)
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

## Code Architecture

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
- Web: LocalStorage for persistence, Supabase for cross-device sync
- Mobile: SecureStore (Keychain/Keystore) for sync key, MMKV for profile data
- No account/email required - privacy-focused approach
- Sync status indicator in header (synced/syncing/offline)

**Key Files**:

- `src/lib/auth/sync-key.ts`: Sync key generation, validation, hashing
- `src/lib/auth/cookie-actions.ts`: Cookie management for user profile
- `src/hooks/useSyncStatus.ts`: React hook for sync state management
- `src/app/sync/page.tsx`: Sync restoration page for secondary devices
- `mobile/src/lib/sync-key.ts`: Mobile sync key logic
- `mobile/src/contexts/UserProfileContext.tsx`: Mobile auth state

### Favorites System

**Feature**: Bookmark crags for quick access to conditions

- Heart icon on WeatherConditionCard and crag detail pages
- Favorites displayed on welcome screen
- Syncs across devices via user profile
- Syncs across devices via user profile

**Key Files**:

- `src/lib/storage/favorites.ts`: Favorites CRUD operations (web)
- `src/components/FavoritesDialog.tsx`: Favorites list modal (web)
- `mobile/app/(tabs)/favorites.tsx`: Favorites grid screen (mobile)
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
- `src/components/dialogs/SearchDialog.tsx`: ⌘K search interface (web)
- `mobile/app/(tabs)/search.tsx`: Search screen (mobile)
- Migration: `supabase/migrations/20251104101753_add_enhanced_search_with_sectors.sql`

### Reports System

**Feature**: Community-submitted reports with 6 categories

- **Categories**: conditions, safety, access, beta, facilities, other
- Condition ratings (1-5): dryness, wind, crowds (conditions category only)
- Category-specific placeholders and validation
- Helpful/unhelpful voting with user profile integration
- Filter tabs on crag pages to view reports by category
- Photo uploads (mobile: camera + gallery, web: file picker)

**Key Files**:

- `src/components/reports/ReportDialog.tsx`: Multi-category report submission (web)
- `src/components/reports/ReportCard.tsx`: Report display with category badges (web)
- `mobile/app/report.tsx`: Report submission modal (mobile)
- Migration: `supabase/migrations/20251028135542_add_report_categories.sql`

### Notifications System

**Feature**: Real-time notifications for report activity

- Web: NotificationCenter dropdown with bell icon
- Mobile: Push notifications via Expo + in-app notification screen
- Supabase Realtime subscriptions for live updates

**Key Files**:

- `src/components/notifications/`: NotificationCenter, NotificationDropdown, NotificationBell (web)
- `src/hooks/useNotifications.ts`: Notification hook (web)
- `mobile/app/(tabs)/notifications.tsx`: Notification history screen (mobile)
- `mobile/src/hooks/useNotifications.ts`: Notification hook with Supabase Realtime (mobile)
- `mobile/src/hooks/usePushNotifications.ts`: Expo push notification registration (mobile)

### Webcams Feature

**Feature**: Live webcam feeds near crags via Windy API

- Webcam preview images with links to Windy
- Displayed on web and mobile crag detail pages when available

**Key Files**:

- `src/components/crag/WebcamsSection.tsx`: Webcam display (web)
- `src/app/api/webcams/route.ts`: Webcams API endpoint (web)
- `mobile/app/crag/[slug].tsx`: Crag detail screen with webcams (mobile)

### Crag Submission System

**Feature**: User-submitted crags with location picking

- Interactive map-based location selection
- Nearby crag detection to prevent duplicates
- Reverse geocoding for address/country info

**Key Files**:

- `mobile/app/add-crag.tsx`: Add new crag modal (mobile)
- `mobile/app/add-sector.tsx`: Add sector to existing crag (mobile)
- `mobile/src/components/CragLocationPicker.tsx`: Interactive map picker (mobile)
- `src/app/api/crags/submit/route.ts`: Crag submission API
- `src/app/api/crags/check-nearby/route.ts`: Nearby crag check API
- `src/app/api/geocode/reverse/route.ts`: Reverse geocoding API

### Component Structure (Web)

Components are organized into subdirectories under `src/components/`:

- `chat/`: ChatInterface, DisambiguationOptions
- `conditions/`: ConditionsDetailSheet, WeatherConditionCard
- `crag/`: CragPageContent, LeafletMap, WebcamsSection
- `dialogs/`: SearchDialog, ConfirmDialog
- `layout/`: Header, HeaderActions, RootLayoutClient
- `notifications/`: NotificationCenter, NotificationDropdown, NotificationBell
- `feed/`: ReportTimeline
- `profile/`: UserMenu, SettingsDialog, SyncExplainerDialog
- `reports/`: ReportCard, ReportDialog
- `map/`: CragLocationPicker
- `ai-elements/`: Custom AI element renderers
- `ui/`: shadcn/ui components

### Mobile App Structure

```
mobile/
├── app/                          # Expo Router routes (file-based)
│   ├── _layout.tsx               # Root layout with providers
│   ├── (tabs)/                   # Tab navigation (6 bottom tabs)
│   │   ├── index.tsx             # Home screen (favorites, search hint)
│   │   ├── search.tsx            # Search crags/sectors
│   │   ├── feed.tsx              # Live community feed
│   │   ├── notifications.tsx     # Notifications inbox & settings
│   │   ├── favorites.tsx         # Bookmarked crags grid
│   │   └── settings.tsx          # Profile, theme, language, units, sync
│   ├── crag/[slug].tsx           # Crag detail page
│   ├── report.tsx                # Report submission modal
│   ├── add-crag.tsx              # Add new crag modal
│   ├── add-sector.tsx            # Add sector modal
│   └── sync.tsx                  # Restore profile from sync key
├── src/
│   ├── api/                      # API client + Supabase client
│   ├── components/               # CragMapView, CragLocationPicker, etc.
│   ├── contexts/                 # Theme, Language, UserProfile, Notifications
│   ├── hooks/                    # useConditions, useSearch, useNotifications, etc.
│   ├── i18n/                     # i18next setup + 27 locale folders
│   ├── lib/                      # storage, sync-key, units
│   ├── types/                    # API response types
│   └── constants/                # config, theme tokens
├── app.json                      # Expo config
├── eas.json                      # EAS Build config
└── package.json
```

**Mobile vs Web differences**:

- Mobile has **no AI chat** — uses direct API calls for conditions
- Mobile uses **tab navigation** (Home, Search, Feed, Favorites, Settings)
- Mobile has **push notifications**; web has **in-app notifications only (no push)**
- Mobile has **camera/gallery photo uploads** for reports
- Mobile uses **MMKV** for local storage (web uses LocalStorage)
- Mobile sends `X-Client-Platform: mobile` header in API requests

### Data Layer

**External APIs** (src/lib/external-apis/):

- `open-meteo.ts`: Fetches 14-day weather forecast with hourly data
- `geocoding.ts`: Location search for crag lookup

**Units System** (src/lib/units/):

- `conversions.ts`: Temperature, wind speed, precipitation unit conversions
- `storage.ts`: User unit preferences persistence
- `types.ts`: Unit types (metric/imperial)

**Country Utilities** (src/lib/utils/country-flags.ts):

- `getCountryFlag()`: Converts country name or ISO code to flag emoji
- `getCountryFlagWithFallback()`: Returns flag emoji or 🏔️ if not found
- `getCountryName()`: Converts ISO 3166-1 alpha-2 code to full country name
- Centralized mapping of 80+ countries with their ISO codes
- Used for metadata generation and location display

**Observability** (src/lib/observability/chat-logger.ts):

- Chat interaction logging with Gemini cost calculation

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
- `crags`, `sectors`, `routes`: Climbing area data (OpenStreetMap + user-submitted)

### Internationalization (i18n)

- 30 supported locales on both web and mobile (same set)
- Web config in `src/lib/i18n/config.ts`, mobile in `mobile/src/i18n/locales/`
- Translation files in `public/locales/{locale}/common.json`
- Client-side: `useClientTranslation` hook for React components
- Server-side: `resolveLocale()` for API routes
- Locale detection via browser headers, stored in cookies
- Special multilingual handling for Switzerland (de-CH, fr-CH, it-CH) based on browser language preference

**Adding Translations**:

1. Add key to `public/locales/en/common.json` (source of truth)
2. Add to all other locale files
3. Use `matchLocale()` for region-specific fallback (e.g., `en-US` → `en`)

### API Routes (src/app/api/)

- `chat/route.ts`: Main streaming chat endpoint with tool calling
- `conditions/route.ts`: Direct conditions API (bypasses chat)
- `search/route.ts`: Crag/sector search with fuzzy matching
- `reports/route.ts`: Community condition reports CRUD
- `reports/feed/route.ts`: Paginated reports feed
- `reports/recent/route.ts`: Recent reports
- `reports/[id]/confirm/route.ts`: Report confirmation/voting
- `confirmations/route.ts`: Report confirmations/voting
- `crags/submit/route.ts`: User crag submission
- `crags/check-nearby/route.ts`: Nearby crag detection
- `geocode/reverse/route.ts`: Reverse geocoding
- `location/[slug]/route.ts`: Crag detail by slug
- `notifications/route.ts`: Notification list
- `push-subscriptions/route.ts`: Push notification subscriptions
- `send-sync-key/route.ts`: Email sync key via Resend
- `sync/[key]/route.ts`: Sync key restoration
- `webcams/route.ts`: Webcam data via Windy API

### Public API v1 (src/app/api/v1/)

Versioned public API for external app consumption (e.g., ClimbingPartnerAI). All endpoints have open CORS (`Access-Control-Allow-Origin: *`). Documentation page at `/docs/api`.

- `crags/search/route.ts`: `GET` — Search crags by name (`?q=&limit=`). Uses `search_crags_enhanced` RPC. Filters out `is_secret` crags.
- `crags/[id]/route.ts`: `GET` — Crag detail by ID with child sectors. Filters out `is_secret` crags. Returns 404 if not found.
- `crags/nearby/route.ts`: `GET` — Find crags near coordinates (`?lat=&lon=&radius=&limit=`). Uses `find_nearby_crags` RPC with bounding box fallback.
- `crags/[id]/reports/route.ts`: `GET` — Community reports for a crag with pagination and optional category filter.
- `reports/route.ts`: `POST` — Submit a new report. Requires `sync_key` for user attribution. Validates category, message length, and rating.

**CORS**: Handled in `src/proxy.ts` — `/api/v1/*` routes get open CORS (`*`), while other `/api/*` routes use origin-restricted CORS for the mobile app.

**Key patterns**:
- Responses use `{ "data": ... }` wrapper, errors use `{ "error": "message" }`
- No internal user IDs or sync keys exposed in responses
- Reports table has a `source` column to track origin (web, mobile, external app)

### Dynamic Routes (src/app/)

- `location/[slug]/page.tsx`: Crag detail pages with ISR (5-minute revalidation)
  - Slug-based lookup (name or coordinates)
  - Server-side conditions calculation
  - Reports list with category filtering
  - Sector information display
  - Map embeds and external links
  - Webcam feeds
- `feed/page.tsx`: Community reports feed page
- `sync/page.tsx`: Sync key restoration page for secondary devices

## Important Patterns

### Tool Calling with Vercel AI SDK

The chat uses the single-step tool pattern (default behavior for fast responses). Tools return structured data, then the LLM generates natural language response. The UI components (via ai-elements) automatically render tool results with proper formatting.

### Type Safety

- Strict TypeScript mode enabled
- `noUnusedLocals` and `noUnusedParameters` enforced
- Zod schemas for API validation

### Path Aliases

Web uses `@/*` to import from `src/`:

```typescript
import { computeConditions } from "@/lib/conditions/conditions.service";
```

Mobile uses `@/*` to import from `mobile/src/`:

```typescript
import { useConditions } from "@/hooks/useConditions";
```

### Git Conventions

Follow conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, etc.
First letter after type is lowercase: `fix: correct friction calculation` (not `fix: Correct...`)

## Testing the App Locally

### Web

1. Install dependencies: `npm install`
2. Set up `.env.local` with Supabase credentials and Google AI API key
3. Run dev server: `npm run dev`
4. Test chat by asking: "What are conditions at El Cap?" or "How's the weather at Fontainebleau?"
5. Check that disambiguation works by searching ambiguous names like "Smith Rock"
6. Verify i18n by changing language in UI

### Mobile

1. Install dependencies: `cd mobile && npm install`
2. Set up `mobile/.env` with API URL and Supabase credentials
3. Run Expo: `npm run start`
4. Open on device via Expo Go or development build

## Known Limitations

- No automated tests yet (consider adding Jest + React Testing Library)
- Weather data limited to 14 days (Open-Meteo free tier)
- No email/password authentication - relies on sync keys only
- AI chat is web-only (not available in mobile app)

## Deployment

**Web**: Deployed on Vercel. On push to main:

1. Vercel auto-builds with Turbopack
2. Environment variables set in Vercel dashboard
3. Edge functions for API routes
4. Automatic HTTPS, caching, geo-distribution

**Mobile**: Built with EAS (Expo Application Services):

- Development, preview, and production build profiles
- iOS: Submitted to App Store
- Android: Internal track builds

See [Vercel docs](https://vercel.com/docs) for web configuration.
