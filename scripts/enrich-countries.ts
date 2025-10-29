/**
 * Country Enrichment Script
 * Reverse geocode all crags to populate country, state, and municipality
 *
 * Prerequisites:
 *   - SUPABASE_SECRET_KEY must be set in .env.local (secret key from dashboard)
 *   - NEXT_PUBLIC_SUPABASE_URL must be set in .env.local
 *
 * Usage:
 *   npx tsx scripts/enrich-countries.ts [--limit=100] [--dry-run]
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Parse CLI arguments
const args = process.argv.slice(2);
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1]) : undefined;
const dryRun = args.includes("--dry-run");

// Initialize Supabase client with service role secret for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERROR: Missing Supabase environment variables");
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY");
  console.error("The service_role secret is required for admin operations (bypasses RLS)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

type Crag = {
  id: string;
  name: string;
  lat: string;
  lon: string;
};

type NominatimResponse = {
  address: {
    country_code?: string;
    state?: string;
    municipality?: string;
    village?: string;
    town?: string;
    city?: string;
  };
  error?: string;
};

/**
 * Reverse geocode coordinates using Nominatim
 */
async function reverseGeocode(
  lat: string,
  lon: string
): Promise<{
  country: string | null;
  state: string | null;
  municipality: string | null;
  village: string | null;
}> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "beta.rocks climbing weather app",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: NominatimResponse = await response.json();

    if (data.error) {
      console.warn(`[Geocoding error] ${data.error}`);
      return { country: null, state: null, municipality: null, village: null };
    }

    const country = data.address.country_code?.toUpperCase() || null;
    const state = data.address.state || null;
    const municipality = data.address.municipality || null;
    const village = data.address.village || data.address.town || data.address.city || null;

    return { country, state, municipality, village };
  } catch (error) {
    console.error(`[Geocoding failed] ${error}`);
    return { country: null, state: null, municipality: null, village: null };
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Update crag with location data
 */
async function updateCrag(
  id: string,
  country: string | null,
  state: string | null,
  municipality: string | null,
  village: string | null
): Promise<boolean> {
  if (dryRun) {
    return true;
  }

  const { data, error } = await supabase
    .from("crags")
    .update({ country, state, municipality, village })
    .eq("id", id)
    .select();

  if (error) {
    console.error(`[DB Error] Failed to update ${id}:`, error);
    console.error(`  Error details:`, JSON.stringify(error, null, 2));
    return false;
  }

  // Verify the update actually worked
  if (!data || data.length === 0) {
    console.error(`[DB Error] Update returned no data for ${id}`);
    return false;
  }

  return true;
}

/**
 * Main enrichment function
 */
async function main() {
  console.log("=== Country Enrichment ===\n");
  console.log("Configuration:");
  console.log(`  Limit: ${limit || "All crags"}`);
  console.log(`  Dry run: ${dryRun ? "Yes" : "No"}`);
  console.log(`  Rate limit: 1 request/second (Nominatim policy)`);
  console.log();

  // Verify database connection and permissions
  console.log("[0/3] Verifying database permissions...");
  const { error: testError } = await supabase.from("crags").select("id, country").limit(1);

  if (testError) {
    console.error("[Error] Failed to connect to database:", testError);
    console.error("Make sure SUPABASE_SECRET_KEY is set correctly in .env.local");
    process.exit(1);
  }

  console.log("[✓] Database connection successful\n");

  // Fetch crags without country
  console.log("[1/3] Fetching crags without country data...");
  let query = supabase
    .from("crags")
    .select("id, name, lat, lon")
    .is("country", null)
    .not("lat", "is", null)
    .not("lon", "is", null);

  if (limit) {
    query = query.limit(limit);
  }

  const { data: crags, error } = await query;

  if (error) {
    console.error("[Error] Failed to fetch crags:", error);
    process.exit(1);
  }

  if (!crags || crags.length === 0) {
    console.log("[Complete] All crags already have country data!");
    return;
  }

  console.log(`[Success] Found ${crags.length} crags to enrich\n`);

  // Estimate time
  const estimatedSeconds = crags.length * 1.1; // 1 req/sec + overhead
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
  console.log(`⏱️  Estimated time: ${estimatedMinutes} minutes\n`);

  // Enrich each crag
  console.log("[2/3] Reverse geocoding crags...");
  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < crags.length; i++) {
    const crag = crags[i] as Crag;
    const progress = `[${i + 1}/${crags.length}]`;

    console.log(`${progress} ${crag.name}...`);

    // Reverse geocode
    const { country, state, municipality, village } = await reverseGeocode(crag.lat, crag.lon);

    if (!country) {
      console.log(`  ⚠️  No country found`);
      skipped++;
    } else {
      console.log(
        `  ✅ ${country} / ${state || "N/A"} / ${municipality || "N/A"} / ${village || "N/A"}`
      );

      // Update database
      const updated = await updateCrag(crag.id, country, state, municipality, village);

      if (updated) {
        success++;
      } else {
        failed++;
      }
    }

    // Rate limiting: 1 request per second
    if (i < crags.length - 1) {
      await sleep(1100); // 1.1 seconds to be safe
    }
  }

  console.log(`\n[3/3] Enrichment complete!`);
  console.log(`  Success: ${success}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total: ${crags.length}`);

  if (failed > 0) {
    console.error("\n[Warning] Some crags failed to update. Check logs above.");
    process.exit(1);
  }

  console.log("\n✅ Enrichment successful!");
}

// Run enrichment
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
