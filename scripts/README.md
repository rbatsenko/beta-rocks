# OSM Crags Import Scripts

Scripts for importing climbing crag data from OpenStreetMap into Supabase.

## Prerequisites

1. **Supabase schema migration** - Run this first:

```sql
-- Add OSM-specific columns to crags table
ALTER TABLE crags ADD COLUMN IF NOT EXISTS osm_id TEXT;
ALTER TABLE crags ADD COLUMN IF NOT EXISTS osm_type TEXT;
ALTER TABLE crags ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE crags ADD COLUMN IF NOT EXISTS climbing_types TEXT[];
ALTER TABLE crags ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE crags ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_crags_name_trgm ON crags USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_crags_source ON crags (source);
CREATE INDEX IF NOT EXISTS idx_crags_osm_id ON crags (osm_id);

-- Enable full-text search extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

2. **Environment variables** - Make sure `.env.local` has:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

## Usage

### Test Import (Poland, 100 crags)

```bash
npm run import:osm -- --test
```

This will:

- Fetch ~3,935 Polish crags
- Convert to Supabase format
- Show statistics
- Insert into database

### Import by Country

```bash
# Poland
npm run import:osm -- --country=PL

# France
npm run import:osm -- --country=FR

# USA
npm run import:osm -- --country=US

# Spain
npm run import:osm -- --country=ES
```

### Worldwide Import

```bash
npm run import:osm
```

**Warning**: This may timeout. Consider running by country or region.

### Dry Run (No Database Changes)

```bash
npm run import:osm -- --dry-run --country=PL
```

This will fetch and transform data but NOT insert into database.

## What Gets Imported

### Data Mapping

| OSM Tag            | Supabase Column      | Example            |
| ------------------ | -------------------- | ------------------ |
| `name`             | `name`               | `Dupa słonia`      |
| `lat`, `lon`       | `lat`, `lon`         | `50.123`, `19.456` |
| `climbing:rock`    | `rock_type`          | `limestone`        |
| `climbing:sport`   | `climbing_types[]`   | `['sport']`        |
| `climbing:boulder` | `climbing_types[]`   | `['boulder']`      |
| `id` + `type`      | `osm_id`, `osm_type` | `1234567`, `node`  |

### Filters

Only imports crags with:

- ✅ `climbing=crag` or `climbing=area` with rock type
- ✅ Valid coordinates (lat/lon)
- ✅ Name field present

Skips:

- ❌ Unnamed features
- ❌ Indoor climbing gyms
- ❌ Features without coordinates

## Output

```
=== OSM Crags Import ===

Configuration:
  Country: PL
  Test mode: No
  Dry run: No

[1/3] Fetching crags from Overpass API...
[Success] Fetched 3935 elements in 12.4s

[2/3] Transforming OSM data to crag records...
[Success] Converted 3821 valid crags

Rock type distribution:
  limestone: 1217 (31.9%)
  granite: 130 (3.4%)
  sandstone: 65 (1.7%)
  unknown: 2409 (63.0%)

[3/3] Inserting crags into Supabase...
[Batch 1] Inserting 500 crags (1-500 of 3821)...
[Success] Inserted/updated 500 crags
[Batch 2] Inserting 500 crags (501-1000 of 3821)...
...

[Complete] Import finished in 8.3s
  Success: 3821
  Errors: 0
  Total: 3821

✅ Import successful!
```

## Periodic Sync

To keep data fresh, run import script weekly/monthly:

```bash
# Add to cron or GitHub Actions
0 0 * * 0 npm run import:osm -- --country=PL  # Every Sunday
```

Updated crags will be overwritten (upsert behavior).

## License Compliance

**Required attribution**: Add to your site footer:

```jsx
© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>
```

Data is under [ODbL license](https://opendatacommons.org/licenses/odbl/).

## Troubleshooting

### Error: Missing Supabase environment variables

Make sure `.env.local` exists with correct values. Restart dev server after adding.

### Error: Query timed out

Overpass API has 25s-300s timeout. For large queries:

- Split by country: `--country=US`
- Use smaller bbox
- Run during off-peak hours (night in Europe)

### Error: Duplicate key value violates unique constraint

This means crag already exists. Script uses `upsert` so it should update instead of error. If you see this, the `id` column might not be set as primary key.

### Low rock_type coverage

Only ~37% of OSM crags have explicit `climbing:rock` tag. Consider:

- Adding geocoding to detect country/region
- Allowing users to submit rock type corrections
- Fallback to OpenBeta for major crags

## Files

```
scripts/
  import-osm-crags.ts          # Main import script
  lib/
    overpass-client.ts          # Overpass API client
  README.md                     # This file
```

## Next Steps

After import:

1. **Update chat API** to query Supabase instead of OpenBeta:

```typescript
// src/app/api/chat/route.ts

const { data: crags } = await supabase
  .from("crags")
  .select("*")
  .ilike("name", `%${searchTerm}%`)
  .limit(10);
```

2. **Add OSM attribution** to footer (see docs/OSM_IMPORT_PLAN.md)

3. **Test searches** with Polish crags like "Dupa słonia", "Rzędkowice"

4. **Add user feedback** - let users correct rock types, add descriptions
