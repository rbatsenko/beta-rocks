================================================================================
                         TEMPS-ROCKS ARCHITECTURE
================================================================================

FRONTEND LAYER (Browser)
========================

    User Interface (Next.js 15)
    ┌─────────────────────────────────────────────────────────┐
    │                                                           │
    │  HomePage (src/app/page.tsx)                             │
    │  ├── ChatInterface (MOCK - returns generic responses)    │
    │  │   ├── Message display area                            │
    │  │   ├── Input form + Send button                        │
    │  │   └── Example query buttons                           │
    │  ├── Features section (6 feature cards)                  │
    │  └── Footer (links, branding)                            │
    │                                                           │
    │  All styled with Tailwind CSS + Dark mode support        │
    │  Component library: 50+ shadcn/ui components available   │
    │                                                           │
    └─────────────────────────────────────────────────────────┘
                           |
                           | HTTP Requests
                           |
                           v
                      
API LAYER (Next.js Edge Routes)
===============================

    POST /api/chat
    ├── Input: { message, lang?, location? }
    ├── Current: Returns mock response after 1s delay
    └── TODO: 
        ├── Integrate Gemini 2.5 Flash (Vercel AI SDK)
        ├── Classify intent: get_conditions | add_report | confirm_report | search | help
        └── Route to external APIs based on intent

    GET /api/sync/:key
    ├── Input: User sync key (from URL)
    ├── Current: Returns empty data structure
    └── TODO: Query Supabase for user's crags, reports, confirmations

    POST /api/sync/:key
    ├── Input: User sync key + merged data
    ├── Current: Returns success timestamp
    └── TODO:
        ├── Implement conflict resolution (via updatedAt)
        ├── Merge with existing data in Supabase
        └── Enable multi-device sync

    MISSING ENDPOINTS (Need to implement):
    ├── GET /api/conditions        -> Get crag conditions (weather + reports)
    ├── POST /api/reports          -> Create new report
    ├── GET /api/reports/:cragId   -> Get all reports for a crag
    └── POST /api/reports/:id/confirm -> Confirm a report (thumbs up)

                           |
                           | Database Queries (Supabase)
                           |
                           v

DATABASE LAYER (Supabase PostgreSQL)
====================================

    Tables:
    
    user_profiles
    ├── id (PK)
    ├── display_name (anonymous display name)
    ├── sync_key_hash (hashed identifier for sync)
    └── timestamps (created_at, updated_at)

    crags (OpenBeta data + community additions)
    ├── id (PK)
    ├── name, country
    ├── lat, lon (geographic coordinates)
    ├── rock_type (granite, sandstone, etc)
    ├── aspects (array of climbing aspect degrees)
    └── timestamps

    sectors
    ├── id (PK)
    ├── crag_id (FK) -> crags
    ├── name, aspect (degrees)
    ├── lat, lon (optional sector-specific coords)
    └── timestamps

    routes
    ├── id (PK)
    ├── sector_id (FK) -> sectors
    ├── name, grade (5.10a, 6a+, etc)
    └── timestamps

    reports (Community contributions)
    ├── id (PK)
    ├── crag_id, sector_id, route_id (FKs - can attach to any level)
    ├── author_id (FK) -> user_profiles
    ├── text (user comment)
    ├── rating_dry (1-5 scale)
    ├── rating_wind (1-5 scale)
    ├── rating_crowds (1-5 scale)
    ├── photo_url (optional image)
    └── timestamps

    confirmations (Report thumbs-up)
    ├── id (PK)
    ├── report_id (FK) -> reports
    ├── user_key_hash (who confirmed it)
    └── created_at

                           |
                           | External API calls from backend
                           |
                           v

EXTERNAL SERVICES (TO BE INTEGRATED)
====================================

    Google Gemini 2.5 Flash (via Vercel AI SDK)
    ├── Purpose: LLM for chat interface
    ├── Input: User message + context
    ├── Output: Natural language response + intent classification
    └── Status: NOT INTEGRATED - API key missing

    OpenBeta API (openbeta.io)
    ├── Purpose: Fetch crag/sector/route data
    ├── Endpoints: Search crags, get details
    ├── Caching: Store in local storage (browser)
    └── Status: NOT INTEGRATED

    Open-Meteo API (open-meteo.com)
    ├── Purpose: Weather forecast data
    ├── Inputs: Latitude, Longitude
    ├── Outputs: Temperature, humidity, wind, rain, sun hours (hourly)
    ├── Cost: FREE, no API key needed
    └── Status: NOT INTEGRATED

    suncalc.js (Lightweight library)
    ├── Purpose: Calculate sun position / shadow analysis
    ├── Inputs: Coordinates + time + aspect degree
    ├── Outputs: Sun altitude, azimuth (determines shadow/shade)
    └── Status: NOT INTEGRATED

                           |
                           | Local Storage (Browser)
                           |
                           v

LOCAL STORAGE LAYER (Client-side - TO BE IMPLEMENTED)
=====================================================

    IndexedDB Database:
    ├── crags (downloaded from OpenBeta, cached)
    ├── reports (downloaded from Supabase)
    ├── confirmations (downloaded from Supabase)
    ├── user_profile (local user data)
    └── sync_key (random UUID for multi-device sync)

    Purposes:
    ├── Work offline (read cached data)
    ├── Reduce API calls (use local data when available)
    ├── Multi-device sync (upload/download via sync key)
    └── Privacy (data stays on device until explicitly synced)

    Sync Flow:
    User takes action → Store locally → Later sync via POST /api/sync/:key

================================================================================
DATA FLOW EXAMPLES
================================================================================

EXAMPLE 1: User asks "Siurana conditions tomorrow?"
──────────────────────────────────────────────────

1. User types message in ChatInterface
   Message: "Siurana conditions tomorrow?"

2. ChatInterface calls POST /api/chat
   Payload: { message: "Siurana conditions tomorrow?" }

3. Backend (TO BE DONE):
   a) Send to Gemini 2.5 Flash LLM
   b) Gemini classifies intent: "get_conditions"
   c) Extract location: "Siurana" + date: "tomorrow"
   d) Query OpenBeta for "Siurana" → Get crag ID + coordinates
   e) Call Open-Meteo API → Get forecast for tomorrow
   f) Calculate conditions (Great/OK/Meh/Nope) based on:
      - Temperature (ideal 50-70°F)
      - Humidity (lower is better for dry)
      - Wind (lower is better)
      - Recent rain (lowers dryness)
   g) Get recent reports from Supabase (reports table)
   h) Format response with forecast summary + top reports
   i) Return to frontend

4. Frontend displays response:
   "Siurana looks OK tomorrow 👍
    High 68°F, Low 45°F, 5mph wind
    Reports: Dry in morning, gets crowded after 2pm"

EXAMPLE 2: User submits a report
──────────────────────────────────

1. User fills out form (rating_dry, rating_wind, rating_crowds, text)
   Submits: { dry: 4, wind: 2, crowds: 1, text: "Really dry today!", crag_id: "siurana" }

2. (Future) Frontend stores locally first (IndexedDB)
   Then calls POST /api/reports (TO BE IMPLEMENTED)

3. Backend:
   a) Validate input
   b) Insert into reports table
      - author_id: user's sync_key_hash (anonymous)
      - created_at: now
      - text, ratings: from user
   c) Return report ID + confirmation

4. Other users see the report when they ask about Siurana
   Displayed with: "👍 3 people confirmed this is accurate"

EXAMPLE 3: User syncs to new device
──────────────────────────────────

Device 1 (original):
- Has sync_key stored locally
- Posts to /api/sync/:sync_key with all local data

Backend:
- Receives data from Device 1
- Merges with existing data using updatedAt timestamps
- Stores merged version in Supabase

Device 2 (new):
- User enters sync_key (QR scan or paste)
- Calls GET /api/sync/:sync_key
- Backend returns all user's crags, reports, confirmations
- Device 2 now has all data synced

================================================================================
TECHNOLOGY STACK SUMMARY
================================================================================

Frontend:
  - Next.js 15 (React framework)
  - React 18 (UI library)
  - TypeScript (type safety)
  - Tailwind CSS (styling)
  - shadcn/ui (50+ pre-built components)
  - Radix UI (accessibility primitives)
  - Lucide React (icons)

State Management:
  - React Hooks (useState, useEffect)
  - TanStack Query (server state)
  - next-themes (dark mode)

Backend:
  - Next.js API Routes (serverless)
  - Supabase (PostgreSQL database)
  - Vercel AI SDK (LLM integration - pending)

Styling:
  - Tailwind CSS (utility-first)
  - PostCSS (CSS processing)
  - Custom design system (earthy colors)

Tools:
  - TypeScript (type checking)
  - ESLint (code linting)
  - Vercel (deployment)

External APIs:
  - Google Gemini 2.5 Flash (LLM) - PENDING
  - OpenBeta (crag data) - PENDING
  - Open-Meteo (weather) - PENDING
  - suncalc (sun position) - PENDING

================================================================================
DEPLOYMENT ARCHITECTURE
================================================================================

Development:
  npm run dev → Next.js dev server on localhost:3000

Production:
  npm run build → Next.js build
  npm start → Production server

Vercel (Current Target):
  ┌──────────────────┐
  │ GitHub Repo      │
  │ (this project)   │
  └────────┬─────────┘
           │ Push to main
           v
  ┌──────────────────────────┐
  │ Vercel CI/CD             │
  │ - Build Next.js app      │
  │ - Run tests (eslint)     │
  │ - Deploy to edge network │
  └────────┬─────────────────┘
           │
           v
  ┌──────────────────────────┐
  │ Vercel Edge Network      │
  │ - Serves HTML/CSS/JS     │
  │ - Runs API routes        │
  │ - Global CDN             │
  └────────┬─────────────────┘
           │
           v
  ┌──────────────────────────┐
  │ Supabase (Database)      │
  │ - PostgreSQL hosted      │
  │ - Real-time updates      │
  │ - Authentication (RLS)   │
  └──────────────────────────┘

================================================================================
CURRENT STATE DIAGRAM
================================================================================

                                ╔═══════════════════════════════╗
                                ║  USER IN BROWSER (Frontend)   ║
                                ╠═══════════════════════════════╣
                                ║                               ║
                                ║  ChatInterface (React)        ║
                                ║  - Message display (mock)     ║
                                ║  - Input form                 ║
                                ║  - Example buttons            ║
                                ║                               ║
                                ║  ThemeToggle (working)        ║
                                ║  Features showcase (working)  ║
                                ║  Footer (working)             ║
                                ║                               ║
                                ╚═════════════╤══════════════════╝
                                              │
                              ┌───────────────┼───────────────┐
                              │ (can't call)  │ (can call)    │
                              v               v               v
                    ┌──────────────┐  ┌──────────────┐  ┌──────────┐
                    │ OpenBeta API │  │ Open-Meteo   │  │ Gemini   │
                    │              │  │ (weather)    │  │ (LLM)    │
                    │ NOT SETUP    │  │ NOT SETUP    │  │ NO KEY   │
                    └──────────────┘  └──────────────┘  └──────────┘

    ┌──────────────────────────────────────────────────────────┐
    │  Next.js API Routes (Running but mostly empty)           │
    ├──────────────────────────────────────────────────────────┤
    │  POST /api/chat                                          │
    │  ├─ Input: message                                       │
    │  ├─ Process: (nothing - just echoes back)                │
    │  └─ Output: mock response                                │
    │                                                           │
    │  GET /api/sync/:key                                      │
    │  ├─ Input: sync key                                      │
    │  ├─ Process: (nothing - just returns empty data)         │
    │  └─ Output: { profile: null, crags: [], ... }            │
    │                                                           │
    │  POST /api/sync/:key                                     │
    │  ├─ Input: sync key + data                               │
    │  ├─ Process: (nothing - just returns success)            │
    │  └─ Output: { success: true, syncedAt: ... }             │
    │                                                           │
    │  MISSING ENDPOINTS:                                      │
    │  - /api/conditions, /api/reports, etc.                   │
    └──────────────────────────────────────────────────────────┘
                              │
                              │ (database not used yet)
                              v
    ┌──────────────────────────────────────────────────────────┐
    │  Supabase (Database initialized, schema defined)         │
    ├──────────────────────────────────────────────────────────┤
    │  Tables (ready, no data queries):                        │
    │  - user_profiles                                         │
    │  - crags                                                 │
    │  - sectors                                               │
    │  - routes                                                │
    │  - reports                                               │
    │  - confirmations                                         │
    └──────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────┐
    │  Browser Local Storage (Not used yet)                    │
    ├──────────────────────────────────────────────────────────┤
    │  IndexedDB (configured, not implemented):                │
    │  - crags (cache)                                         │
    │  - reports (cache)                                       │
    │  - confirmations (cache)                                 │
    │  - sync_key (identity)                                   │
    └──────────────────────────────────────────────────────────┘

================================================================================
NEXT IMPLEMENTATION ROADMAP
================================================================================

PHASE 1: LLM Integration (1-2 weeks)
  [ ] Add GOOGLE_GENERATIVE_AI_API_KEY to .env
  [ ] Install/configure Vercel AI SDK
  [ ] Implement Gemini 2.5 Flash integration in /api/chat
  [ ] Add intent classification logic
  [ ] Add tool routing (which API to call based on intent)

PHASE 2: External APIs (1-2 weeks)
  [ ] OpenBeta integration (search/fetch crags)
  [ ] Open-Meteo integration (get weather forecasts)
  [ ] suncalc integration (calculate sun position)
  [ ] Cache strategy for external data

PHASE 3: Core Business Logic (1 week)
  [ ] Implement computeConditions() function
  [ ] Build condition scoring algorithm
  [ ] Build reports CRUD endpoints (/api/reports)
  [ ] Build conditions endpoint (/api/conditions)

PHASE 4: Database Integration (1 week)
  [ ] Implement Supabase queries in all endpoints
  [ ] Add rate limiting
  [ ] Add data validation

PHASE 5: Offline & Sync (1 week)
  [ ] Implement IndexedDB local storage
  [ ] Add sync key generation
  [ ] Implement conflict resolution
  [ ] Test multi-device sync

PHASE 6: UI Enhancements (1 week)
  [ ] Add report form component
  [ ] Add settings/sync page
  [ ] Add shareable links for crags
  [ ] Polish animations & transitions

PHASE 7: Testing & Deployment (1 week)
  [ ] Write integration tests
  [ ] Manual testing on multiple devices
  [ ] Deploy to Vercel
  [ ] Monitor & debug

Total Estimated: 7-9 weeks to full MVP

================================================================================
