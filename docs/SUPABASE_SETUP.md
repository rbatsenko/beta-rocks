# Supabase Setup Guide

## ✅ Current Status

- **Env Variables**: Added to `.env`
- **Supabase Client**: Fixed to use Next.js env variables
- **Database Schema**: Defined in TypeScript types

## 📋 Database Schema

Your Supabase has 6 tables ready:

### 1. **user_profiles**

```sql
- id (UUID, PK)
- sync_key_hash (string) - Hash of the sync key for identity
- display_name (string, nullable) - User's display name
- created_at, updated_at (timestamps)
```

### 2. **crags**

```sql
- id (string, PK) - OpenBeta ID or custom
- name (string)
- lat, lon (numbers)
- country (string)
- rock_type (string, nullable)
- aspects (number[], nullable) - Array of compass bearings
- created_at, updated_at (timestamps)
```

### 3. **sectors**

```sql
- id (string, PK)
- crag_id (FK → crags)
- name (string)
- lat, lon (numbers, nullable)
- aspect (number, nullable) - Compass bearing
- created_at, updated_at (timestamps)
```

### 4. **routes**

```sql
- id (string, PK)
- sector_id (FK → sectors)
- name (string)
- grade (string, nullable)
- created_at, updated_at (timestamps)
```

### 5. **reports**

```sql
- id (string, PK)
- crag_id (FK → crags, nullable)
- sector_id (FK → sectors, nullable)
- route_id (FK → routes, nullable)
- author_id (FK → user_profiles, nullable)
- rating_dry (1-5, nullable)
- rating_wind (1-5, nullable)
- rating_crowds (1-5, nullable)
- text (string, nullable)
- photo_url (string, nullable)
- created_at, updated_at (timestamps)
```

### 6. **confirmations**

```sql
- id (string, PK)
- report_id (FK → reports)
- user_key_hash (string) - Hash of user's sync key
- created_at (timestamp)
```

## 🚀 Next Steps

### 1. Verify Connection

```bash
npm run dev
# Check browser console for errors connecting to Supabase
```

### 2. Create Helper Functions

Create `src/lib/db/queries.ts` with these functions:

```typescript
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

// Crags
export async function fetchCrags() {
  const { data, error } = await supabase.from("crags").select("*");
  if (error) throw error;
  return data;
}

export async function fetchCragById(id: string) {
  const { data, error } = await supabase
    .from("crags")
    .select("*, sectors(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

// Reports
export async function createReport(report: {
  cragId?: string;
  sectorId?: string;
  routeId?: string;
  authorId?: string;
  dryRating?: number;
  windRating?: number;
  crowdsRating?: number;
  text?: string;
  photoUrl?: string;
}) {
  const { data, error } = await supabase
    .from("reports")
    .insert({
      id: uuidv4(),
      crag_id: report.cragId,
      sector_id: report.sectorId,
      route_id: report.routeId,
      author_id: report.authorId,
      rating_dry: report.dryRating,
      rating_wind: report.windRating,
      rating_crowds: report.crowdsRating,
      text: report.text,
      photo_url: report.photoUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchReportsByCrag(cragId: string) {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("crag_id", cragId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// User Profiles
export async function fetchOrCreateUserProfile(syncKeyHash: string) {
  // Try to fetch existing
  const { data: existing, error: fetchError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("sync_key_hash", syncKeyHash)
    .single();

  if (!fetchError && existing) return existing;

  // Create new profile
  const { data, error } = await supabase
    .from("user_profiles")
    .insert({
      id: uuidv4(),
      sync_key_hash: syncKeyHash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Confirmations
export async function confirmReport(reportId: string, userKeyHash: string) {
  const { data, error } = await supabase
    .from("confirmations")
    .insert({
      id: uuidv4(),
      report_id: reportId,
      user_key_hash: userKeyHash,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchConfirmationsForReport(reportId: string) {
  const { data, error } = await supabase
    .from("confirmations")
    .select("*")
    .eq("report_id", reportId);
  if (error) throw error;
  return data;
}
```

### 3. Install uuid

```bash
npm install uuid
npm install --save-dev @types/uuid
```

### 4. Test with API Routes

Update `/src/app/api/reports/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createReport, fetchReportsByCrag } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const cragId = request.nextUrl.searchParams.get("cragId");
  if (!cragId) {
    return NextResponse.json({ error: "cragId required" }, { status: 400 });
  }

  try {
    const reports = await fetchReportsByCrag(cragId);
    return NextResponse.json(reports);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const report = await createReport(body);
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

### 5. Row-Level Security (RLS)

For production, enable RLS on all tables:

```sql
-- Enable RLS
ALTER TABLE crags ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmations ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "crags_public_read" ON crags FOR SELECT USING (true);
CREATE POLICY "reports_public_read" ON reports FOR SELECT USING (true);

-- Allow authenticated users to insert reports
CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (true);
```

## 🔑 Environment Variables

Your `.env` should have:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

These are **public** (safe to expose since they're marked `NEXT_PUBLIC_`). The `sb_publishable_` prefix is Supabase's new key format.

## 📡 Sync Key Storage

For multi-device sync:

1. Generate on first visit (browser)
2. Store in localStorage
3. Hash with SHA-256 for database (never store raw key)
4. QR code: `temps.rocks/sync?key=<key>`

```typescript
import { sha256 } from "crypto-js";

function hashSyncKey(key: string): string {
  return sha256(key).toString();
}

function generateSyncKey(): string {
  return crypto.randomUUID();
}
```

## 🐛 Troubleshooting

| Error                                   | Solution                                     |
| --------------------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL is undefined` | Check `.env` file and restart dev server     |
| `Cannot read property 'auth'`           | Ensure `typeof window !== 'undefined'` check |
| `Relation does not exist`               | Verify tables exist in Supabase dashboard    |
| `Permission denied`                     | Check RLS policies or use anon key           |

## ✨ Files to Create

- [ ] `src/lib/db/queries.ts` - Database helper functions
- [ ] `src/app/api/reports/route.ts` - Reports endpoints
- [ ] `src/app/api/confirmations/route.ts` - Confirmations endpoints
- [ ] `src/lib/auth/sync-key.ts` - Sync key utilities

## 📚 References

- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [Database Types](./CODEBASE_ANALYSIS.md#supabase-database-schema)
- [Environment Variables](../.env.example)
