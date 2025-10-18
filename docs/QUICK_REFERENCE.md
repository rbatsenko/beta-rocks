# temps.rocks - Quick Reference Guide

## Project Overview

**Project**: temps.rocks - Chat-first climbing conditions web app  
**Status**: UI/Styling complete, core logic ~15% implemented  
**Tech Stack**: Next.js 15, React 18, TypeScript, Tailwind CSS, Supabase  
**Deployment**: Vercel

---

## File Locations - Find What You Need

### Main Application

```
src/app/page.tsx                      HOME PAGE
src/app/layout.tsx                    ROOT LAYOUT
src/components/ChatInterface.tsx       MAIN CHAT UI (MOCK)
src/components/Features.tsx            FEATURES SECTION
src/components/Footer.tsx              FOOTER
src/index.css                          DESIGN SYSTEM & COLORS
```

### API Endpoints (Need Work)

```
src/app/api/chat/route.ts              ← 90% TODO: Implement Gemini integration
src/app/api/sync/[key]/route.ts        ← 80% TODO: Implement Supabase integration
```

### Database & Integrations

```
src/integrations/supabase/client.ts    Supabase client (initialized)
src/integrations/supabase/types.ts     Database types (auto-generated)
```

### Utilities

```
src/hooks/use-toast.ts                 Toast notifications
src/hooks/use-mobile.tsx               Mobile detection
src/lib/utils.ts                       Classname utilities (cn)
```

### Configuration

```
next.config.ts                         Next.js config
tsconfig.json                          TypeScript config
tailwind.config.ts                     Tailwind CSS config
package.json                           Dependencies & scripts
.env                                   Environment variables (DO NOT COMMIT)
```

### Documentation

```
docs/PRD.md                            Full product requirements
CODEBASE_ANALYSIS.md                   Detailed codebase analysis
ARCHITECTURE.md                        Architecture diagrams
SUMMARY.txt                            Quick summary
QUICK_REFERENCE.md                     This file
```

---

## Quick Commands

```bash
npm install              # Install dependencies
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm start                # Start production server
npm run lint             # Run ESLint
npm run type-check       # TypeScript checking
vercel                   # Deploy to Vercel
```

---

## Database Tables (Supabase)

| Table         | Purpose                   | Key Fields                                                |
| ------------- | ------------------------- | --------------------------------------------------------- |
| user_profiles | User identity             | id, sync_key_hash, display_name                           |
| crags         | Climbing locations        | id, name, lat, lon, country                               |
| sectors       | Areas within crags        | id, crag_id, name, aspect                                 |
| routes        | Individual climbs         | id, sector_id, name, grade                                |
| reports       | User-submitted conditions | id, crag_id, rating_dry, rating_wind, rating_crowds, text |
| confirmations | Thumbs-up on reports      | id, report_id, user_key_hash                              |

---

## Current API Endpoints

### POST /api/chat (MOCK)

```javascript
// Request
{ message: string, lang?: string, location?: { lat, lon } }

// Response
{ reply: string, chips: [], state: { location } }

// Status: Returns mock response, needs Gemini integration
```

### GET /api/sync/:key (STUB)

```javascript
// Response
{ profile: null, crags: [], reports: [], confirmations: [] }

// Status: Needs Supabase queries
```

### POST /api/sync/:key (STUB)

```javascript
// Response
{ success: true, syncedAt: ISO timestamp }

// Status: Needs conflict resolution & Supabase save
```

---

## TODO: High Priority Features

1. **Gemini 2.5 Flash Integration** (Lines 14, 27-29 in /api/chat/route.ts)
   - Add GOOGLE_GENERATIVE_AI_API_KEY to .env
   - Use Vercel AI SDK
   - Classify user intent

2. **Real API Integrations**
   - OpenBeta: Fetch crags/sectors/routes
   - Open-Meteo: Get weather forecasts (FREE, no key)
   - suncalc: Calculate sun position

3. **Condition Logic**
   - Implement rule-based scoring
   - Create computeConditions() function

4. **Reports CRUD**
   - POST /api/reports (create)
   - GET /api/reports/:cragId (fetch)
   - POST /api/reports/:id/confirm (confirm)

5. **Supabase Integration**
   - Add queries to all API endpoints
   - Implement conflict resolution for sync

---

## Design System

### Colors (HSL format)

- **Primary**: Terracotta (15° 65% 55%)
- **Secondary**: Sage green (140° 20% 60%)
- **Accent**: Sky blue (200° 75% 55%)
- **Background**: Warm beige light / Dark mode
- **Foreground**: Dark brown light / Off-white dark

### Typography

- Font: System default (see Tailwind config)
- Spacing: Tailwind defaults

### Components

- 50+ shadcn/ui components available
- All in `src/components/ui/`

---

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL               ✓ Set in .env
NEXT_PUBLIC_SUPABASE_ANON_KEY          ✓ Set in .env
GOOGLE_GENERATIVE_AI_API_KEY                         ✗ MISSING - Add for Gemini
AI_PROVIDER=google                     ✗ Set this
```

---

## Component Tree

```
<RootLayout>
  <ThemeProvider>
    <HomePage>
      <ChatInterface />
      <Features />
      <Footer />
    </HomePage>
    <Toaster />
  </ThemeProvider>
</RootLayout>
```

---

## External APIs to Integrate

| Service          | Purpose      | Status | Free? |
| ---------------- | ------------ | ------ | ----- |
| Gemini 2.5 Flash | LLM for chat | TODO   | No    |
| OpenBeta         | Crag data    | TODO   | Yes   |
| Open-Meteo       | Weather      | TODO   | Yes   |
| suncalc          | Sun position | TODO   | Yes   |

---

## Deployment

- **Platform**: Vercel
- **Database**: Supabase (PostgreSQL)
- **Build Command**: `npm run build`
- **Start Command**: `npm start`

---

## Key Statistics

- **Files**: ~20 core source files
- **Components**: 55+ (50+ shadcn/ui + 5 custom)
- **Dependencies**: 40+ npm packages
- **Lines of Code**: ~2000 (excluding node_modules)
- **Implementation Status**: ~15% complete

---

## Next Developer Should Know

1. **Dark mode works** - Toggle button in chat interface
2. **50+ UI components ready** - Import from src/components/ui/
3. **TypeScript strict mode** - All variables typed
4. **Tailwind CSS** - All styling via classes
5. **API stubs exist** - Fill in the TODO comments
6. **Database schema ready** - Start writing queries
7. **Vercel AI SDK available** - Just needs Gemini key

---

## Common Tasks

### Add a new API endpoint

1. Create file: `src/app/api/[route]/route.ts`
2. Export `GET`, `POST`, etc. functions
3. Verify with TypeScript
4. Call from frontend via `fetch("/api/[route]")`

### Add a new UI component

1. Create file: `src/components/[ComponentName].tsx`
2. Use shadcn/ui primitives if needed
3. Style with Tailwind classes
4. Import in parent component
5. Use path alias: `import { Button } from "@/components/ui/button"`

### Query Supabase

1. Import client: `import { supabase } from "@/integrations/supabase/client"`
2. Use TypeScript types: `Tables<"crags">`
3. Query: `supabase.from("crags").select("*")`
4. Handle errors & types

### Deploy to Vercel

1. Push to GitHub main branch
2. Vercel auto-deploys on push
3. Check vercel.com for status
4. Monitor logs on Vercel dashboard

---

## Troubleshooting

**Port 3000 already in use?**

```bash
lsof -i :3000          # Find process
kill -9 <PID>          # Kill it
```

**TypeScript errors?**

```bash
npm run type-check     # Check all files
```

**Need to regenerate Supabase types?**

```bash
# Run in Supabase CLI (if installed)
# Types auto-update from schema
```

**Dark mode not working?**

- Check next-themes provider in layout.tsx
- Ensure Tailwind darkMode: "class" in config

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai)

---

**Last Updated**: 2025-10-18  
**Analysis by**: Claude Code
