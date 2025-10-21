/**
 * OSM Crags Import Script
 * Bulk import climbing crags from OpenStreetMap to Supabase
 *
 * Usage:
 *   npx tsx scripts/import-osm-crags.ts [--country=PL] [--test]
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import {
  fetchClimbingCrags,
  getCenterCoords,
  extractClimbingTypes,
  normalizeRockType,
  type OsmElement,
} from "./lib/overpass-client";

// Parse CLI arguments
const args = process.argv.slice(2);
const countryCode = args.find((arg) => arg.startsWith("--country="))?.split("=")[1];
const testMode = args.includes("--test");
const dryRun = args.includes("--dry-run");

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERROR: Missing Supabase environment variables");
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

type CragRecord = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country: string | null;
  rock_type: string | null;
  osm_id: string;
  osm_type: string;
  source: string;
  climbing_types: string[] | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  last_synced_at: string;
};

/**
 * Convert OSM element to Supabase crag record
 */
function osmToCrag(element: OsmElement): CragRecord | null {
  const tags = element.tags || {};
  const coords = getCenterCoords(element);

  if (!coords) {
    console.warn(
      `[Skip] No coordinates for ${tags.name || "unnamed"} (${element.type}:${element.id})`
    );
    return null;
  }

  if (!tags.name) {
    console.warn(`[Skip] No name for ${element.type}:${element.id} at ${coords.lat},${coords.lon}`);
    return null;
  }

  // Skip indoor climbing gyms - we only want outdoor crags
  if (
    tags.indoor === "yes" ||
    tags["climbing:indoor"] === "yes" ||
    tags.leisure === "sports_centre"
  ) {
    console.warn(`[Skip] Indoor gym: ${tags.name}`);
    return null;
  }

  // Skip if it's just a route (not a crag/area)
  if (tags.climbing === "route" || tags.climbing === "route_bottom") {
    console.warn(`[Skip] Individual route (not crag): ${tags.name}`);
    return null;
  }

  const climbingTypes = extractClimbingTypes(tags);
  const rockType = normalizeRockType(tags["climbing:rock"] || tags["rock"]);

  // Generate unique ID from OSM data
  const id = `osm_${element.type}_${element.id}`;

  return {
    id,
    name: tags.name,
    lat: coords.lat,
    lon: coords.lon,
    country: null, // Will be enriched later or via post-processing
    rock_type: rockType,
    osm_id: String(element.id),
    osm_type: element.type,
    source: "osm",
    climbing_types: climbingTypes.length > 0 ? climbingTypes : null,
    description: tags.description || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
  };
}

/**
 * Batch insert crags into Supabase
 */
async function batchInsertCrags(crags: CragRecord[]): Promise<{ success: number; errors: number }> {
  const BATCH_SIZE = 500; // Supabase recommends batches of 500-1000
  let success = 0;
  let errors = 0;

  for (let i = 0; i < crags.length; i += BATCH_SIZE) {
    const batch = crags.slice(i, i + BATCH_SIZE);

    console.log(
      `[Batch ${Math.floor(i / BATCH_SIZE) + 1}] Inserting ${batch.length} crags (${i + 1}-${i + batch.length} of ${crags.length})...`
    );

    if (dryRun) {
      console.log("[Dry run] Skipping actual insert");
      success += batch.length;
      continue;
    }

    try {
      // Use upsert to handle duplicates (update if exists, insert if new)
      const { data, error } = await supabase
        .from("crags")
        .upsert(batch, {
          onConflict: "id",
          ignoreDuplicates: false, // Update existing records
        })
        .select();

      if (error) {
        console.error(`[Error] Batch insert failed:`, error);
        errors += batch.length;
      } else {
        success += data?.length || batch.length;
        console.log(`[Success] Inserted/updated ${data?.length || batch.length} crags`);
      }
    } catch (err) {
      console.error(`[Error] Exception during batch insert:`, err);
      errors += batch.length;
    }

    // Rate limiting: wait 100ms between batches
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return { success, errors };
}

/**
 * Main import function
 */
async function main() {
  console.log("=== OSM Crags Import ===\n");
  console.log("Configuration:");
  console.log(`  Country: ${countryCode || "Worldwide"}`);
  console.log(`  Test mode: ${testMode ? "Yes (limit 100)" : "No"}`);
  console.log(`  Dry run: ${dryRun ? "Yes" : "No"}`);
  console.log();

  // Fetch crags from Overpass API
  console.log("[1/3] Fetching crags from Overpass API...");
  const startFetch = Date.now();

  let elements: OsmElement[];

  try {
    if (testMode) {
      // Test mode: fetch small region (Poland bbox)
      elements = await fetchClimbingCrags({
        bbox: [49, 14, 55, 24], // Poland approximately
        timeout: 60,
      });
    } else if (countryCode) {
      // Fetch specific country
      elements = await fetchClimbingCrags({
        countryCode,
        timeout: 300,
      });
    } else {
      // Worldwide fetch (may timeout - consider splitting by region)
      console.warn("[Warning] Worldwide fetch may timeout. Consider using --country=XX");
      elements = await fetchClimbingCrags({
        timeout: 300,
      });
    }
  } catch (error) {
    console.error("[Error] Failed to fetch from Overpass API:", error);
    process.exit(1);
  }

  const fetchTime = ((Date.now() - startFetch) / 1000).toFixed(1);
  console.log(`[Success] Fetched ${elements.length} elements in ${fetchTime}s\n`);

  // Transform to crag records
  console.log("[2/3] Transforming OSM data to crag records...");
  const crags = elements.map(osmToCrag).filter((crag): crag is CragRecord => crag !== null);

  console.log(`[Success] Converted ${crags.length} valid crags\n`);

  // Show statistics
  const rockTypeStats = crags.reduce(
    (acc, crag) => {
      const type = crag.rock_type || "unknown";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log("Rock type distribution:");
  Object.entries(rockTypeStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([type, count]) => {
      const percentage = ((count / crags.length) * 100).toFixed(1);
      console.log(`  ${type}: ${count} (${percentage}%)`);
    });
  console.log();

  // Show sample records
  if (dryRun || testMode) {
    console.log("Sample crags to import:");
    crags.slice(0, 10).forEach((crag, idx) => {
      console.log(`\n  ${idx + 1}. ${crag.name}`);
      console.log(`     Location: ${crag.lat.toFixed(6)}, ${crag.lon.toFixed(6)}`);
      console.log(`     Rock type: ${crag.rock_type || "unknown"}`);
      console.log(`     Climbing types: ${crag.climbing_types?.join(", ") || "N/A"}`);
      console.log(`     OSM: ${crag.osm_type}:${crag.osm_id}`);
    });
    console.log();
  }

  // Insert into Supabase
  console.log("[3/3] Inserting crags into Supabase...");
  const startInsert = Date.now();

  const { success, errors } = await batchInsertCrags(crags);

  const insertTime = ((Date.now() - startInsert) / 1000).toFixed(1);

  console.log(`\n[Complete] Import finished in ${insertTime}s`);
  console.log(`  Success: ${success}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total: ${crags.length}`);

  if (errors > 0) {
    console.error("\n[Warning] Some crags failed to import. Check logs above.");
    process.exit(1);
  }

  console.log("\n✅ Import successful!");
}

// Run import
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
