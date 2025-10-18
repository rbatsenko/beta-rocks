# temps.rocks - Codebase Analysis Index

This directory contains comprehensive analysis documentation of the temps.rocks codebase.

## Quick Start - Where to Begin

### For the First Time (5 minutes)

Start with **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** for a quick overview organized by purpose.

### For Team Onboarding (30 minutes)

1. Read **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** (5 min)
2. Skim **[SUMMARY.txt](./SUMMARY.txt)** (10 min)
3. Review **[ARCHITECTURE.md](./ARCHITECTURE.md)** diagrams (15 min)

### For Deep Dive (1 hour)

Read **[CODEBASE_ANALYSIS.md](./CODEBASE_ANALYSIS.md)** for complete details.

### For Implementation

1. Check **[CODEBASE_ANALYSIS.md](./CODEBASE_ANALYSIS.md)** Section 8: Missing/TODO Features
2. Reference **[ARCHITECTURE.md](./ARCHITECTURE.md)** Implementation Roadmap
3. Use **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** for file locations and commands

---

## Analysis Files

### 1. [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Start Here! (7.6 KB)

**Best for:** Quick lookups, finding files, common commands

- File locations organized by purpose
- Quick npm commands
- Database tables summary
- API endpoints status
- High-priority TODOs
- Troubleshooting tips
- Resource links

### 2. [SUMMARY.txt](./SUMMARY.txt) - Executive Overview (13 KB)

**Best for:** Understanding current state at a glance

- Project structure
- Implementation status (complete/partial/not)
- API routes summary
- Data models
- Libraries & dependencies
- Design system reference
- Critical TODO items
- Project metrics
- Key files to review

### 3. [ARCHITECTURE.md](./ARCHITECTURE.md) - System Design (19 KB)

**Best for:** Understanding how everything fits together

- Frontend layer
- API layer
- Database layer
- External services
- Local storage design
- Data flow examples (3 scenarios)
- Technology stack
- Deployment architecture
- Current state diagrams
- Implementation roadmap (7 phases)

### 4. [CODEBASE_ANALYSIS.md](./CODEBASE_ANALYSIS.md) - Detailed Reference (16 KB)

**Best for:** In-depth code understanding

- Complete directory structure
- Implementation status details
- All API routes (with line numbers)
- React components inventory
- All dependencies (40+)
- Data models (all 6 tables)
- Configuration files
- Missing MVP features (prioritized)
- File paths reference
- Quick start guide

### 5. [FILES_CREATED.txt](./FILES_CREATED.txt) - This Analysis (6.5 KB)

**Best for:** Understanding what was analyzed

- Overview of all files generated
- Key insights summary
- File usage recommendations
- How to use the analysis

---

## Project at a Glance

**Project**: temps.rocks - Chat-first climbing conditions web app  
**Status**: UI/Styling 100% done, Core logic ~15% done  
**Tech Stack**: Next.js 15, React 18, TypeScript, Tailwind CSS, Supabase  
**Deployment**: Vercel

### What's Working

- ✓ Modern UI with dark mode
- ✓ 50+ pre-built components (shadcn/ui)
- ✓ Beautiful design system
- ✓ Database schema (6 tables)
- ✓ TypeScript + Tailwind fully setup

### What Needs Work

- ✗ Gemini 2.5 Flash integration (API key needed)
- ✗ External API connections (OpenBeta, Open-Meteo)
- ✗ Business logic (condition calculations)
- ✗ Database queries
- ✗ Multi-device sync

---

## Document Purpose & Reading Guide

| If you need to...      | Read this                      | Time   |
| ---------------------- | ------------------------------ | ------ |
| Find a specific file   | QUICK_REFERENCE.md             | 2 min  |
| Understand the project | SUMMARY.txt                    | 10 min |
| Learn the architecture | ARCHITECTURE.md                | 20 min |
| Deep dive into code    | CODEBASE_ANALYSIS.md           | 30 min |
| Set up for development | QUICK_REFERENCE.md commands    | 5 min  |
| See what's missing     | CODEBASE_ANALYSIS.md Section 8 | 10 min |
| Plan next phase        | ARCHITECTURE.md Roadmap        | 15 min |
| Add a new feature      | All files (reference)          | varies |

---

## Key Statistics

| Metric                  | Value         |
| ----------------------- | ------------- |
| Core source files       | ~20           |
| React components        | 55+           |
| npm dependencies        | 40+           |
| Lines of code           | ~2000         |
| Supabase tables         | 6             |
| API endpoints           | 3 (need work) |
| UI components ready     | 50+           |
| Implementation complete | ~15%          |
| Estimated MVP time      | 3-4 weeks     |

---

## Critical Next Steps

1. Get Google Gemini API key
2. Add GOOGLE_GENERATIVE_AI_API_KEY to .env
3. Implement Gemini integration in `/api/chat/route.ts`
4. Connect OpenBeta & Open-Meteo APIs
5. Build condition calculation logic
6. Implement reports CRUD endpoints
7. Add Supabase queries
8. Implement multi-device sync
9. Add report UI components
10. Test & deploy

---

## File Locations Reference

```
src/
├── app/
│   ├── page.tsx                    Homepage
│   ├── layout.tsx                  Root layout
│   └── api/
│       ├── chat/route.ts           Chat endpoint (NEEDS WORK)
│       └── sync/[key]/route.ts     Sync endpoints (NEEDS WORK)
├── components/
│   ├── ChatInterface.tsx           Main chat UI
│   ├── Features.tsx                Features section
│   ├── Footer.tsx                  Footer
│   ├── ThemeProvider.tsx           Dark mode
│   ├── ThemeToggle.tsx             Theme button
│   └── ui/                         50+ components
├── integrations/
│   └── supabase/
│       ├── client.ts               Supabase client
│       └── types.ts                DB types
├── hooks/
│   ├── use-toast.ts                Toasts
│   └── use-mobile.tsx              Mobile detection
├── lib/
│   └── utils.ts                    Utilities
└── index.css                       Design system

Configuration:
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── package.json
├── .env                            ENVIRONMENT
└── .env.example                    TEMPLATE

Documentation:
├── docs/PRD.md                     Product requirements
├── CODEBASE_ANALYSIS.md            Detailed analysis
├── SUMMARY.txt                     Quick summary
├── ARCHITECTURE.md                 System design
├── QUICK_REFERENCE.md              Cheat sheet
└── README_ANALYSIS.md              This file
```

---

## NPM Commands

```bash
npm install              # Install dependencies
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm start                # Start production
npm run lint             # Run ESLint
npm run type-check       # Check TypeScript
vercel                   # Deploy to Vercel
```

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL              ✓ Set in .env
NEXT_PUBLIC_SUPABASE_ANON_KEY         ✓ Set in .env
GOOGLE_GENERATIVE_AI_API_KEY                        ✗ MISSING - Add for Gemini
AI_PROVIDER                           Set to "google"
```

---

## Database Tables

1. **user_profiles** - User identity & sync key
2. **crags** - Climbing locations (from OpenBeta)
3. **sectors** - Areas within crags
4. **routes** - Individual climbs
5. **reports** - Community-submitted conditions
6. **confirmations** - Thumbs-up on reports

---

## Technology Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **UI**: Tailwind CSS, shadcn/ui (50+ components)
- **Database**: Supabase (PostgreSQL)
- **AI**: Vercel AI SDK (not integrated yet)
- **Forms**: react-hook-form, Zod
- **Utilities**: date-fns, sonner, lucide-react
- **Deployment**: Vercel

---

## Common Tasks

### Add API Endpoint

See QUICK_REFERENCE.md "Common Tasks" section

### Query Database

See QUICK_REFERENCE.md "Common Tasks" section

### Add UI Component

See QUICK_REFERENCE.md "Common Tasks" section

### Deploy

See QUICK_REFERENCE.md "Common Tasks" section

---

## Troubleshooting

For common issues and solutions, see **QUICK_REFERENCE.md** "Troubleshooting" section.

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Tailwind Docs](https://tailwindcss.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai)

---

## Questions?

Refer to the appropriate analysis file:

- **Finding files?** → QUICK_REFERENCE.md
- **How does it work?** → ARCHITECTURE.md
- **What's the code doing?** → CODEBASE_ANALYSIS.md
- **Current status?** → SUMMARY.txt
- **Specific details?** → CODEBASE_ANALYSIS.md (search by section)

---

## Analysis Information

- **Generated**: October 18, 2025
- **Version**: 1.0
- **Status**: Complete
- **Coverage**: 100% of codebase
- **Last Updated**: October 18, 2025

---

**Happy coding! Use these docs as your reference guide throughout development.**
