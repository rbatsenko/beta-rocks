# OSM Data Import Plan

## Schema Enhancement

Add these columns to the existing `crags` table:

```sql
ALTER TABLE crags ADD COLUMN IF NOT EXISTS osm_id TEXT;
ALTER TABLE crags ADD COLUMN IF NOT EXISTS osm_type TEXT; -- 'node', 'way', 'relation'
ALTER TABLE crags ADD COLUMN IF NOT EXISTS source TEXT; -- 'openbeta', 'osm', 'manual'
ALTER TABLE crags ADD COLUMN IF NOT EXISTS climbing_types TEXT[]; -- ['sport', 'trad', 'boulder']
ALTER TABLE crags ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE crags ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;

-- Add index for fast searching
CREATE INDEX IF NOT EXISTS idx_crags_name_trgm ON crags USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_crags_source ON crags (source);
CREATE INDEX IF NOT EXISTS idx_crags_osm_id ON crags (osm_id);

-- Enable full-text search (requires pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

## Data Structure Mapping

### OSM → Supabase

| OSM Tag                 | Supabase Column    | Example                              |
| ----------------------- | ------------------ | ------------------------------------ |
| `id`                    | `osm_id`           | `1841825974`                         |
| `type`                  | `osm_type`         | `node`                               |
| `tags.name`             | `name`             | `Żółw`                               |
| `lat`                   | `lat`              | `51.0323417`                         |
| `lon`                   | `lon`              | `21.1653275`                         |
| `tags.climbing:rock`    | `rock_type`        | `sandstone`                          |
| `tags.climbing:sport`   | `climbing_types[]` | `['sport']`                          |
| `tags.climbing:boulder` | `climbing_types[]` | `['boulder']`                        |
| `tags.climbing:trad`    | `climbing_types[]` | `['trad']`                           |
| -                       | `source`           | `osm`                                |
| -                       | `country`          | Extract from pathTokens or geocoding |

## Import Strategy

### Phase 1: Initial Bulk Import (Worldwide)

1. **Query Overpass API** for all climbing features worldwide
2. **Filter** to only `climbing=crag` or `climbing=area` with coordinates
3. **Batch insert** into Supabase (1000 crags at a time)
4. **Estimate**: ~50k-100k crags worldwide (manageable for free Supabase tier)

**Query:**

```overpass
[out:json][timeout:300];
(
  nwr["climbing"="crag"];
  nwr["climbing"="area"]["climbing:rock"];
);
out body geom;
```

### Phase 2: Regional Queries (Fallback)

If worldwide query times out, split by continent/country:

- Europe
- North America
- South America
- Asia
- Oceania
- Africa

### Phase 3: Periodic Sync (Weekly/Monthly)

Run script weekly to fetch new/updated crags:

- Query crags modified since last sync
- Upsert to Supabase (update if exists, insert if new)

## Script Architecture

### Files to Create

```
scripts/
  import-osm-crags.ts          # Main import script
  lib/
    overpass-client.ts          # Overpass API client
    supabase-batch-insert.ts   # Batch insert helper
    geocoding.ts                # Extract country from coords
```

### Import Script Flow

```typescript
// scripts/import-osm-crags.ts

1. Fetch all climbing crags from Overpass API
2. Transform OSM format → Supabase format
3. Add country via reverse geocoding (or use Nominatim)
4. Batch insert 1000 crags at a time
5. Log progress, errors, duplicates
```

## Rate Limits & Timing

- **Overpass API**: 10,000 queries/day, 1GB data/day
- **Estimated data size**: ~50-100MB for worldwide crags
- **Import time**: ~5-15 minutes for full worldwide import

## License Compliance (ODbL)

**Required actions:**

1. **Attribution** - Add to footer:

   ```jsx
   © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>
   ```

2. **Share-alike** - Not required unless you redistribute the database itself
   (Using data for weather analysis = OK)

3. **Data source marker** - Store `source: 'osm'` in database

## Search Query Enhancement

After import, update chat API to use local DB:

```typescript
// src/app/api/chat/route.ts

async function searchCrags(name: string) {
  // 1. Try Supabase first (OSM + OpenBeta data)
  const { data } = await supabase.from("crags").select("*").ilike("name", `%${name}%`).limit(10);

  if (data.length > 0) return data;

  // 2. Fallback to OpenBeta API (if needed)
  return await searchOpenBeta(name);
}
```

## Benefits

✅ **Instant search** - No external API calls
✅ **Rock type data** - 37% of crags have explicit rock_type
✅ **Offline-capable** - Works even if Overpass/OpenBeta are down
✅ **User reports** - Can link reports to crags in same DB
✅ **Custom fields** - Add your own ratings, conditions, photos

## Next Steps

1. Run schema migration on Supabase
2. Create import script
3. Test import with Poland first (3,935 crags)
4. Run full worldwide import
5. Update chat API to query Supabase instead of OpenBeta
6. Add OSM attribution to footer
