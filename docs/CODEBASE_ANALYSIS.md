# temps.rocks - Comprehensive Codebase Analysis

## 1. PROJECT STRUCTURE

```
temps-rocks/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts              # Chat endpoint (TODO: Gemini integration)
│   │   │   └── sync/[key]/route.ts        # Multi-device sync endpoints
│   │   ├── layout.tsx                     # Root layout with metadata
│   │   └── page.tsx                       # Main homepage
│   ├── components/
│   │   ├── ChatInterface.tsx              # Main chat UI (mock implementation)
│   │   ├── Features.tsx                   # Features showcase section
│   │   ├── Footer.tsx                     # Footer with links
│   │   ├── ThemeProvider.tsx              # Dark mode provider
│   │   ├── ThemeToggle.tsx                # Dark mode toggle button
│   │   └── ui/                            # shadcn/ui components (50+ components)
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts                  # Supabase client initialization
│   │       └── types.ts                   # Auto-generated Supabase DB types
│   ├── hooks/
│   │   ├── use-toast.ts                   # Toast notifications
│   │   └── use-mobile.tsx                 # Mobile detection hook
│   ├── lib/
│   │   └── utils.ts                       # Utility functions (cn for classnames)
│   ├── index.css                          # Design system (colors, gradients, shadows)
│   ├── App.tsx                            # React app root
│   └── main.tsx                           # React DOM render
├── docs/
│   └── PRD.md                             # Product Requirements Document
├── public/
│   └── favicon.svg                        # App icon
├── next.config.ts                         # Next.js configuration
├── tsconfig.json                          # TypeScript configuration
├── tailwind.config.ts                     # Tailwind CSS config
├── postcss.config.js                      # PostCSS config
├── package.json                           # Dependencies & scripts
├── components.json                        # shadcn/ui config
├── .env                                   # Environment variables (secrets)
├── .env.example                           # Example env file
└── .gitignore                             # Git ignore rules
```

## 2. CURRENT IMPLEMENTATION STATUS

### IMPLEMENTED ✓
- **UI Framework**: Next.js 15 with React 18
- **Styling**: Tailwind CSS + dark mode support (next-themes)
- **Component Library**: shadcn/ui (50+ pre-built components)
- **Design System**: Custom earthy color palette (terracotta, sage green, sky blue)
- **Chat Interface**: Visual UI with message display, input form, example queries
- **Features Section**: Showcase of 6 key features with icons
- **Footer**: Branding and links
- **Dark Mode**: Full support with theme toggle
- **Database Schema**: Supabase types for crags, sectors, routes, reports, confirmations, user_profiles

### PARTIALLY IMPLEMENTED ⚠️
- **Chat API** (/api/chat/route.ts): Accepts requests but returns mock responses
- **Sync API** (/api/sync/[key]/route.ts): Endpoints defined but no Supabase integration
- **Supabase Client**: Configured but not actively used

### NOT IMPLEMENTED ❌
- AI/LLM integration (Gemini 2.5 Flash via Vercel AI SDK)
- Real API calls to OpenBeta (crags/sectors/routes)
- Real API calls to Open-Meteo (weather/forecast)
- Real API calls to suncalc (sun position)
- Supabase database operations (create, read, update, delete)
- Message handling and intent classification
- Weather/condition calculations
- Community reports CRUD
- Report confirmations
- Local storage/IndexedDB
- Sync key generation and validation
- Multi-device sync logic
- Shareable links for crags/sectors/routes

## 3. API ROUTES

### POST /api/chat
**File**: `/Users/rbatsenko/Desktop/Projects/temps-rocks/src/app/api/chat/route.ts`

**Current State**: Mock implementation
- Accepts: `{ message: string, lang?: string, location?: { lat: number; lon: number } }`
- Returns: `{ reply: string, chips: [], state: { location } }`
- **TODOs**:
  - Integrate Gemini 2.5 Flash via Vercel AI SDK
  - Implement intent classification (get_conditions, add_report, confirm_report, search_crag, nearby, help)
  - Add external API calls based on intent

### GET /api/sync/:key
**File**: `/Users/rbatsenko/Desktop/Projects/temps-rocks/src/app/api/sync/[key]/route.ts`

**Current State**: Stub implementation
- Returns: `{ profile: null, crags: [], reports: [], confirmations: [] }`
- **TODOs**:
  - Query Supabase for user data matching sync_key_hash
  - Validate sync key

### POST /api/sync/:key
**Current State**: Stub implementation
- Returns: `{ success: true, syncedAt: ISO timestamp }`
- **TODOs**:
  - Implement conflict resolution via updatedAt timestamps
  - Merge and save user data to Supabase
  - Handle sync key validation

**Missing Endpoints**:
- /api/conditions - Get crag conditions
- /api/reports - Create/retrieve community reports
- /api/reports/:id/confirm - Confirm a report

## 4. REACT COMPONENTS

### Page Components
- **src/app/page.tsx** - Main homepage (uses ChatInterface, Features, Footer)
- **src/app/layout.tsx** - Root layout with ThemeProvider and metadata

### Feature Components
| Component | File | Status | Purpose |
|-----------|------|--------|---------|
| ChatInterface | src/components/ChatInterface.tsx | Partial | Chat UI with mock responses, example queries |
| Features | src/components/Features.tsx | Complete | 6-feature showcase grid |
| Footer | src/components/Footer.tsx | Complete | Footer with branding and links |
| ThemeProvider | src/components/ThemeProvider.tsx | Complete | next-themes wrapper |
| ThemeToggle | src/components/ThemeToggle.tsx | Complete | Dark/light mode button |

### ChatInterface Details
- State: messages, input, isLoading
- Mock message handling (1s delay)
- Example queries: "Siurana conditions tomorrow?", "Is El Pati dry this afternoon?", "Best sectors at Fontainebleau today?"
- **Line 38**: TODO comment for actual chat endpoint implementation
- Uses UI components: Button, Input, Card, icons (Send, Loader2)

### shadcn/ui Components (50+ available)
Located in `src/components/ui/`:
- Layout: accordion, breadcrumb, card, carousel, drawer, sidebar, tabs
- Forms: checkbox, input, label, radio-group, select, switch, textarea, toggle
- Dialogs: alert-dialog, dialog, popover, tooltip, hover-card
- Data Display: table, pagination, progress, slider, scroll-area
- Navigation: command, context-menu, dropdown-menu, menubar, navigation-menu
- And many more...

## 5. LIBRARIES & DEPENDENCIES

### Core Framework
- **next**: ^15.0.0 - React framework
- **react**: ^18.3.1 - UI library
- **react-dom**: ^18.3.1 - React DOM

### Database & Backend
- **@supabase/supabase-js**: ^2.75.1 - Supabase client
- **@tanstack/react-query**: ^5.83.0 - Server state management

### AI & LLM
- **ai**: ^5.0.0 - Vercel AI SDK (not yet integrated)

### UI & Styling
- **tailwindcss**: ^3.4.17 - Utility-first CSS
- **next-themes**: ^0.3.0 - Dark mode support
- **@radix-ui/***: 40+ components - Headless UI primitives
- **shadcn/ui**: Built on Radix UI (components in src/components/ui/)
- **lucide-react**: ^0.462.0 - Icon library
- **clsx**: ^2.1.1 - Classname utility
- **tailwind-merge**: ^2.6.0 - Merge Tailwind classes
- **tailwindcss-animate**: ^1.0.7 - Animation utilities

### Forms & Validation
- **react-hook-form**: ^7.61.1 - Form state management
- **@hookform/resolvers**: ^3.10.0 - Form validation resolvers
- **zod**: ^3.25.76 - TypeScript-first schema validation

### Utilities
- **date-fns**: ^3.6.0 - Date manipulation
- **sonner**: ^1.7.4 - Toast notifications
- **vaul**: ^0.9.9 - Drawer component
- **react-resizable-panels**: ^2.1.9 - Resizable layout
- **embla-carousel-react**: ^8.6.0 - Carousel
- **react-day-picker**: ^8.10.1 - Date picker
- **recharts**: ^2.15.4 - Charts library
- **cmdk**: ^1.1.1 - Command palette
- **input-otp**: ^1.4.2 - OTP input
- **class-variance-authority**: ^0.7.1 - Component variants

### Development Tools
- **typescript**: ^5.8.3 - TypeScript
- **eslint**: ^9.32.0 - Linting
- **tailwindcss**: ^3.4.17 - CSS framework
- **autoprefixer**: ^10.4.21 - CSS vendor prefixes
- **postcss**: ^8.5.6 - CSS processing

## 6. DATA MODELS

### Supabase Schema (from `/src/integrations/supabase/types.ts`)

#### user_profiles
```typescript
{
  id: string (PK)
  display_name?: string
  sync_key_hash: string (unique identifier for sync)
  created_at?: timestamp
  updated_at?: timestamp
}
```

#### crags
```typescript
{
  id: string (PK)
  name: string
  lat: number
  lon: number
  country: string
  rock_type?: string
  aspects?: number[] (array of aspect degrees)
  created_at?: timestamp
  updated_at?: timestamp
}
```

#### sectors
```typescript
{
  id: string (PK)
  crag_id?: string (FK → crags)
  name: string
  lat?: number
  lon?: number
  aspect?: number (single aspect in degrees)
  created_at?: timestamp
  updated_at?: timestamp
}
```

#### routes
```typescript
{
  id: string (PK)
  sector_id?: string (FK → sectors)
  name: string
  grade?: string
  created_at?: timestamp
  updated_at?: timestamp
}
```

#### reports
```typescript
{
  id: string (PK)
  author_id?: string (FK → user_profiles)
  crag_id?: string (FK → crags)
  sector_id?: string (FK → sectors)
  route_id?: string (FK → routes)
  text?: string
  rating_dry?: number (1-5)
  rating_wind?: number (1-5)
  rating_crowds?: number (1-5)
  photo_url?: string
  created_at?: timestamp
  updated_at?: timestamp
}
```

#### confirmations
```typescript
{
  id: string (PK)
  report_id?: string (FK → reports)
  user_key_hash: string (hashed sync key)
  created_at?: timestamp
}
```

## 7. CONFIGURATION FILES

### TypeScript (tsconfig.json)
- Target: ES2017
- Lib: ES2020, DOM, DOM.Iterable
- Module: ESNext
- Strict mode enabled for null checks
- Path alias: @/* → ./src/*
- Supports React JSX

### Next.js (next.config.ts)
```typescript
- React strict mode: enabled
- TypeScript: configured with tsconfig.json
```

### Tailwind (tailwind.config.ts)
- Dark mode: class-based
- Content: pages, components, app, src directories
- Custom colors: primary, secondary, accent, muted, destructive
- Custom gradients: gradient-warm, gradient-earth, gradient-hero
- Custom shadows: shadow-soft, shadow-medium, shadow-elevated
- Custom transitions: transition-smooth, transition-bounce

### Design System (src/index.css)
**Light Mode (Root)**:
- Background: Warm beige (35° 20% 96%)
- Foreground: Dark brown (20° 15% 15%)
- Primary: Terracotta (15° 65% 55%)
- Secondary: Sage green (140° 20% 60%)
- Accent: Sky blue (200° 75% 55%)

**Dark Mode**:
- Background: Very dark (20° 20% 10%)
- Foreground: Off-white (35° 10% 95%)
- Primary: Lighter terracotta (15° 70% 60%)
- Secondary: Lighter green (140° 25% 45%)
- Accent: Lighter blue (200° 70% 50%)

### Environment Variables (.env.example)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
AI_PROVIDER=google
```

### ESLint (eslint.config.mjs)
- Uses TypeScript-ESLint
- React Hooks plugin

## 8. MISSING/TODO FEATURES FOR MVP

### High Priority - Core Functionality
- [ ] **Gemini 2.5 Flash Integration** - LLM for chat interface
  - File: `/src/app/api/chat/route.ts` (line 14, 27-29)
  - Use Vercel AI SDK to process messages
  - Implement intent classification
  
- [ ] **Weather Integration** - Open-Meteo API
  - Missing: Get hourly forecast for lat/lon
  - Missing: Parse temperature, humidity, wind, rain, sun hours
  - Missing: Store cache strategy

- [ ] **Crag/Sector/Route Data** - OpenBeta API
  - Missing: Search/fetch crags from OpenBeta
  - Missing: Get sectors and routes for crags
  - Missing: Cache in local storage

- [ ] **Condition Calculation Logic**
  - Missing: computeConditions() module
  - Missing: Rule-based scoring (dry, windy, crowded)
  - Missing: Output: score + label (Great/OK/Meh/Nope) + reasons

- [ ] **Community Reports** - CRUD operations
  - Missing: POST /api/reports endpoint
  - Missing: GET /api/reports/:cragId endpoint
  - Missing: Supabase INSERT/SELECT operations
  - Missing: Report form UI component

- [ ] **Report Confirmations**
  - Missing: /api/reports/:id/confirm endpoint
  - Missing: Confirmation counter UI
  - Missing: Prevent duplicate confirmations

### Medium Priority - Sync & Offline
- [ ] **Sync Key Generation** - Random UUID/nanoid
  - Missing: Generate unique key per user
  - Missing: Hash for secure storage
  - Missing: Display QR code for sharing

- [ ] **Local Storage** - IndexedDB implementation
  - Missing: Store crags, reports, confirmations locally
  - Missing: Sync with Supabase on POST /api/sync/:key

- [ ] **Multi-Device Sync** - Full implementation
  - File: `/src/app/api/sync/[key]/route.ts`
  - Missing: Conflict resolution via updatedAt
  - Missing: Merge algorithm
  - Missing: Bidirectional sync

- [ ] **Shareable Links** - Dynamic routes
  - Missing: Dynamic route for /[crag]/[sector]/[route]
  - Missing: Public conditions view
  - Missing: Report display on share page

### Low Priority - Polish & Features
- [ ] **Profanity Filter** - For community reports
- [ ] **Rate Limiting** - By sync key/IP
- [ ] **Photo Upload** - For reports
- [ ] **Settings Page** - Display sync key, QR code, display name
- [ ] **Search/Nearby** - Geographic queries
- [ ] **Multi-language Support** - i18n for chat
- [ ] **Embeddable Widget** - For gyms/guides/blogs

## 9. FILE PATHS REFERENCE

### Core Application Files
| File | Purpose |
|------|---------|
| `/src/app/page.tsx` | Main homepage |
| `/src/app/layout.tsx` | Root layout |
| `/src/app/api/chat/route.ts` | Chat endpoint (90% TODO) |
| `/src/app/api/sync/[key]/route.ts` | Sync endpoints (80% TODO) |
| `/src/components/ChatInterface.tsx` | Chat UI (mock) |
| `/src/components/Features.tsx` | Features section |
| `/src/components/Footer.tsx` | Footer |
| `/src/integrations/supabase/client.ts` | Supabase client |
| `/src/integrations/supabase/types.ts` | DB types (auto-generated) |
| `/src/index.css` | Design system & Tailwind |
| `/docs/PRD.md` | Product requirements |
| `/next.config.ts` | Next.js config |
| `/tsconfig.json` | TypeScript config |
| `/tailwind.config.ts` | Tailwind config |
| `/package.json` | Dependencies & scripts |

### Key Lines with TODOs
- `/src/app/api/chat/route.ts:14` - "TODO: Implement Gemini 2.5 Flash"
- `/src/app/api/chat/route.ts:27` - "TODO: Call Gemini 2.5 Flash API"
- `/src/app/api/chat/route.ts:28` - "TODO: Implement intent classification"
- `/src/app/api/chat/route.ts:29` - "TODO: Call external APIs based on intent"
- `/src/components/ChatInterface.tsx:38` - "TODO: Implement actual chat endpoint"
- `/src/app/api/sync/[key]/route.ts:12` - "TODO: Query Supabase"
- `/src/app/api/sync/[key]/route.ts:41` - "TODO: Implement conflict resolution"
- `/src/app/api/sync/[key]/route.ts:42` - "TODO: Merge and save to Supabase"

## 10. QUICK START GUIDE

### Development
```bash
npm install
npm run dev
# Opens on http://localhost:3000
```

### Build & Deploy
```bash
npm run build
npm start
# Deploy to Vercel with: vercel
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

## 11. NEXT STEPS FOR IMPLEMENTATION

1. **Set up Vercel AI SDK** - Configure Gemini 2.5 Flash integration
2. **Implement Chat API** - Process messages and classify intents
3. **Connect OpenBeta** - Fetch crag/sector/route data
4. **Integrate Open-Meteo** - Get real-time weather forecasts
5. **Build Condition Logic** - Rule-based scoring system
6. **Implement Reports** - CRUD operations and UI
7. **Add Local Storage** - IndexedDB for offline support
8. **Complete Sync Logic** - Multi-device synchronization
9. **Create Share Pages** - Dynamic routes for conditions views
10. **Add Settings UI** - Sync key, display name, reset data

---

**Project Status**: Early stage (UI/styling complete, core logic ~15% implemented)
**Estimated Remaining Work**: 3-4 weeks of development for MVP features
