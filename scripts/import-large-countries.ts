/**
 * Import Large Countries in Grid Chunks
 * Splits countries into smaller bounding boxes to avoid Overpass API 504 timeouts
 *
 * Usage:
 *   npx tsx scripts/import-large-countries.ts --country=ES [--dry-run]
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
const countryArg = args.find((arg) => arg.startsWith("--country="));
const countryCode = countryArg?.split("=")[1];
const dryRun = args.includes("--dry-run");

if (!countryCode) {
  console.error("ERROR: --country=XX required");
  console.error("Example: npx tsx scripts/import-large-countries.ts --country=ES");
  process.exit(1);
}

// Country bounding boxes split into manageable grids (2-3 degrees per chunk to avoid 504 timeouts)
const COUNTRY_GRIDS: Record<string, { minLat: number; maxLat: number; minLon: number; maxLon: number; gridSize: number }> = {
  // Spain - split into ~2-degree chunks
  ES: { minLat: 36, maxLat: 44, minLon: -10, maxLon: 4, gridSize: 2 },
  // France - split into ~2-degree chunks
  FR: { minLat: 42, maxLat: 51, minLon: -5, maxLon: 9, gridSize: 2 },
  // UK - split into ~2-degree chunks (4-degree still caused timeouts)
  GB: { minLat: 49, maxLat: 61, minLon: -9, maxLon: 2, gridSize: 2 },
  // US - split into ~3-degree chunks (very large country, more cells needed)
  US: { minLat: 24, maxLat: 50, minLon: -125, maxLon: -66, gridSize: 3 },
  // Greece - split into ~2-degree chunks
  GR: { minLat: 35, maxLat: 42, minLon: 19, maxLon: 28, gridSize: 2 },
  // Portugal - split into ~2-degree chunks
  PT: { minLat: 37, maxLat: 42, minLon: -10, maxLon: -6, gridSize: 2 },
  // Sweden - split into ~3-degree chunks (very large north-south)
  SE: { minLat: 55, maxLat: 69, minLon: 11, maxLon: 24, gridSize: 3 },
  // Bosnia and Herzegovina - split into ~2-degree chunks
  BA: { minLat: 43, maxLat: 46, minLon: 15, maxLon: 20, gridSize: 2 },
};

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERROR: Missing Supabase environment variables");
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

function osmToCrag(element: OsmElement): CragRecord | null {
  const tags = element.tags || {};
  const coords = getCenterCoords(element);

  if (!coords || !tags.name) return null;

  // Skip indoor gyms
  if (
    tags.indoor === "yes" ||
    tags["climbing:indoor"] === "yes" ||
    tags.leisure === "sports_centre"
  ) {
    return null;
  }

  // Skip individual routes
  if (
    tags.climbing === "route" ||
    tags.climbing === "route_bottom" ||
    tags.climbing === "route_top"
  ) {
    return null;
  }

  const climbingTypes = extractClimbingTypes(tags);
  const rockType = normalizeRockType(
    tags["rock_type"] || tags["climbing:rock"] || tags["rock"]
  );

  return {
    id: `osm_${element.type}_${element.id}`,
    name: tags.name,
    lat: coords.lat,
    lon: coords.lon,
    country: null,
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

async function batchInsertCrags(crags: CragRecord[]): Promise<{ success: number; errors: number }> {
  const BATCH_SIZE = 500;
  let success = 0;
  let errors = 0;

  for (let i = 0; i < crags.length; i += BATCH_SIZE) {
    const batch = crags.slice(i, i + BATCH_SIZE);

    if (dryRun) {
      success += batch.length;
      continue;
    }

    try {
      const { data, error } = await supabase
        .from("crags")
        .upsert(batch, {
          onConflict: "id",
          ignoreDuplicates: false,
        })
        .select();

      if (error) {
        console.error(`[Error] Batch insert failed:`, error);
        errors += batch.length;
      } else {
        success += data?.length || batch.length;
      }
    } catch (err) {
      console.error(`[Error] Exception during batch insert:`, err);
      errors += batch.length;
    }

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return { success, errors };
}

async function main() {
  const config = COUNTRY_GRIDS[countryCode];
  if (!config) {
    console.error(`ERROR: Country ${countryCode} not configured for grid import`);
    console.error(`Available: ${Object.keys(COUNTRY_GRIDS).join(", ")}`);
    process.exit(1);
  }

  console.log(`=== Importing ${countryCode} in Grid Chunks ===\n`);
  console.log("Configuration:");
  console.log(`  Grid size: ${config.gridSize}° x ${config.gridSize}°`);
  console.log(`  Dry run: ${dryRun ? "Yes" : "No"}`);
  console.log();

  // Generate grid cells
  const cells: Array<[number, number, number, number]> = [];
  for (let lat = config.minLat; lat < config.maxLat; lat += config.gridSize) {
    for (let lon = config.minLon; lon < config.maxLon; lon += config.gridSize) {
      cells.push([
        lat,
        lon,
        Math.min(lat + config.gridSize, config.maxLat),
        Math.min(lon + config.gridSize, config.maxLon),
      ]);
    }
  }

  console.log(`[Grid] Generated ${cells.length} cells to process\n`);

  let totalCrags = 0;
  let totalSuccess = 0;
  let totalErrors = 0;

  // Process each grid cell
  for (let i = 0; i < cells.length; i++) {
    const [minLat, minLon, maxLat, maxLon] = cells[i];

    console.log(`\n[${i + 1}/${cells.length}] Processing grid cell: [${minLat},${minLon} to ${maxLat},${maxLon}]`);

    try {
      const elements = await fetchClimbingCrags({
        bbox: [minLat, minLon, maxLat, maxLon],
        timeout: 180, // 3 minutes per cell
      });

      console.log(`  Fetched ${elements.length} elements`);

      const crags = elements
        .map(osmToCrag)
        .filter((crag): crag is CragRecord => crag !== null);

      console.log(`  Converted ${crags.length} valid crags`);

      if (crags.length > 0) {
        const { success, errors } = await batchInsertCrags(crags);
        totalCrags += crags.length;
        totalSuccess += success;
        totalErrors += errors;
        console.log(`  Inserted ${success} crags, ${errors} errors`);
      }

      // Rate limit between cells (10 seconds to avoid 429 errors)
      if (i < cells.length - 1) {
        console.log(`  Waiting 10s before next cell...`);
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    } catch (error) {
      console.error(`  [Error] Failed to process cell:`, error);
      console.log(`  Skipping to next cell...`);
      // Continue to next cell despite errors
    }
  }

  console.log(`\n=== Import Complete ===`);
  console.log(`  Total crags: ${totalCrags}`);
  console.log(`  Success: ${totalSuccess}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  Grid cells processed: ${cells.length}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
