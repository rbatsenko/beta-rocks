import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import {
  searchCrags,
  fetchReportsByCrag,
  fetchSectorsByCrag,
  findCragByCoordinates,
} from "@/lib/db/queries";
import { getWeatherForecast } from "@/lib/external-apis/open-meteo";
import { computeConditions } from "@/lib/conditions/conditions.service";
import { generateSlug, parseCoordinatesFromSlug, getBaseSlug } from "@/lib/utils/slug";
import { CragPageContent } from "@/components/CragPageContent";
import type { RockType } from "@/lib/conditions/conditions.service";

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

// Allow dynamic params (generate on-demand if not pre-rendered)
export const dynamicParams = true;

// Cached function to fetch crag data
const getCragBySlug = cache(async (slug: string) => {
  console.log(`[getCragBySlug] Processing slug: ${slug}`);

  // First try name-based search (more reliable than low-precision coordinates)
  const baseSlug = getBaseSlug(slug);

  // Try to extract the most specific part for search (last word is often most specific)
  const slugParts = baseSlug.split("-");
  const searchName = slugParts[slugParts.length - 1]; // Last word (e.g., "mamutowa" from "mamut-mamutowa")

  console.log(`[getCragBySlug] Searching by name: "${searchName}" (from base slug: ${baseSlug})`);

  const results = await searchCrags(searchName);

  if (results && results.length > 0) {
    console.log(`[getCragBySlug] Found ${results.length} results by name`);

    // If single result, return it
    if (results.length === 1) {
      console.log(`[getCragBySlug] Single match: ${results[0].name}`);
      return results[0];
    }

    // If multiple results, try exact slug match first
    const exactMatch = results.find((crag) => generateSlug(crag.name) === baseSlug);
    if (exactMatch) {
      console.log(`[getCragBySlug] Exact slug match: ${exactMatch.name}`);
      return exactMatch;
    }

    // If slug has coordinates, use them to disambiguate
    const coords = parseCoordinatesFromSlug(slug);
    if (coords) {
      console.log(
        `[getCragBySlug] Multiple matches, using coordinates to disambiguate: ${coords.lat}, ${coords.lon}`
      );
      const crag = await findCragByCoordinates(coords.lat, coords.lon, 0.01);
      if (crag) {
        console.log(`[getCragBySlug] Coordinate-based disambiguation: ${crag.name}`);
        return crag;
      }
    }

    // Fallback: return first result
    console.log(`[getCragBySlug] Returning first result: ${results[0].name}`);
    return results[0];
  }

  // No name match - try pure coordinate lookup as last resort
  const coords = parseCoordinatesFromSlug(slug);
  if (coords) {
    console.log(
      `[getCragBySlug] No name matches, trying coordinate lookup: ${coords.lat}, ${coords.lon}`
    );
    const crag = await findCragByCoordinates(coords.lat, coords.lon, 0.01);
    if (crag) {
      console.log(`[getCragBySlug] Found by coordinates only: ${crag.name}`);
      return crag;
    }
  }

  console.log(`[getCragBySlug] No crag found for slug: ${slug}`);
  return null;
});

// Cached function to get all crag data (reports, sectors, conditions)
const getCragData = cache(async (slug: string) => {
  try {
    console.log(`[getCragData] Starting data fetch for slug: ${slug}`);

    const crag = await getCragBySlug(slug).catch((err) => {
      console.error(`[getCragData] Error in getCragBySlug:`, err);
      throw new Error(`Failed to fetch crag: ${err?.message || String(err)}`);
    });

    if (!crag) {
      console.error(`[getCragData] Crag not found for slug: ${slug}`);
      return null;
    }

    console.log(
      `[getCragData] Found crag: ${crag.name} (${crag.id}), coords: ${crag.lat}, ${crag.lon}`
    );

    // Fetch all data in parallel with individual error handling
    console.log(`[getCragData] Fetching weather, reports, and sectors...`);
    const [weather, reports, sectors] = await Promise.all([
      getWeatherForecast(crag.lat, crag.lon, 14).catch((err) => {
        console.error(`[getCragData] Error fetching weather:`, err);
        throw new Error(`Weather fetch failed: ${err?.message || String(err)}`);
      }),
      fetchReportsByCrag(crag.id, 20).catch((err) => {
        console.error(`[getCragData] Error fetching reports:`, err);
        // Don't fail on reports error, just return empty array
        return [];
      }),
      fetchSectorsByCrag(crag.id).catch((err) => {
        console.error(`[getCragData] Error fetching sectors:`, err);
        // Don't fail on sectors error, just return empty array
        return [];
      }),
    ]);

    console.log(`[getCragData] Weather data received:`, {
      hasCurrent: !!weather?.current,
      currentTemp: weather?.current?.temperature,
      hourlyCount: weather?.hourly?.length || 0,
    });

    if (!weather || !weather.current) {
      console.error(`[getCragData] Invalid weather data for crag ${crag.id}`, weather);
      throw new Error("Failed to fetch weather data");
    }

    // Transform weather data to match conditions service expected format
    console.log(`[getCragData] Transforming weather data...`);
    const transformedWeather = {
      current: {
        temp_c: weather.current.temperature,
        humidity: weather.current.humidity,
        wind_kph: weather.current.windSpeed,
        precip_mm: weather.current.precipitation,
      },
      hourly: weather.hourly.map((hour) => ({
        time: hour.time,
        temp_c: hour.temperature,
        humidity: hour.humidity,
        wind_kph: hour.windSpeed,
        precip_mm: hour.precipitation,
        weatherCode: hour.weatherCode,
      })),
      daily: weather.daily,
      latitude: crag.lat,
      longitude: crag.lon,
    };

    // Compute current conditions
    console.log(`[getCragData] Computing conditions...`);
    const rawConditions = computeConditions(
      transformedWeather,
      (crag.rock_type as RockType) || "unknown",
      0,
      { includeNightHours: false }
    );

    console.log(`[getCragData] Raw conditions:`, {
      hasFrictionRating: typeof rawConditions?.frictionRating === "number",
      frictionRating: rawConditions?.frictionRating,
      rating: rawConditions?.rating,
    });

    if (!rawConditions || typeof rawConditions.frictionRating !== "number") {
      console.error(
        `[getCragData] Invalid conditions computed for crag ${crag.id}:`,
        rawConditions
      );
      throw new Error("Failed to compute conditions");
    }

    // Transform conditions to match expected interface (frictionRating -> frictionScore)
    // Also add daily forecast from weather data
    const conditions = {
      ...rawConditions,
      frictionScore: rawConditions.frictionRating,
      dailyForecast: weather.daily,
    };

    console.log(`[getCragData] Successfully fetched all data for ${crag.name}`);

    return {
      crag,
      weather,
      conditions,
      reports,
      sectors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(`[getCragData] Error fetching data for slug ${slug}:`, {
      message: errorMessage,
      stack: errorStack,
      error,
    });
    // Re-throw with more context
    throw new Error(`Failed to load location data: ${errorMessage}`);
  }
});

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const data = await getCragData(slug);

    if (!data) {
      return {
        title: "Location Not Found",
        description: "The climbing location you are looking for could not be found.",
      };
    }

    const { crag, conditions } = data;
    const location = [crag.municipality, crag.state, crag.country].filter(Boolean).join(", ");

    return {
      title: `${crag.name} - Real-time Climbing Conditions | beta.rocks`,
      description: `Live conditions for ${crag.name}${location ? ` in ${location}` : ""}. Currently ${conditions.rating} (${conditions.frictionScore}/5). Check weather, friction, and community reports.`,
      openGraph: {
        title: `${crag.name} Climbing Conditions`,
        description: `${conditions.rating} conditions today - ${conditions.frictionScore}/5 friction score. ${conditions.isDry ? "Dry" : "Wet"}. ${crag.rock_type ? `${crag.rock_type} rock.` : ""}`,
        type: "website",
        locale: "en_US",
        siteName: "beta.rocks",
      },
      twitter: {
        card: "summary_large_image",
        title: `${crag.name} Climbing Conditions`,
        description: `${conditions.rating} (${conditions.frictionScore}/5) - Check live conditions`,
      },
      alternates: {
        canonical: `/location/${slug}`,
      },
    };
  } catch (error) {
    console.error("[generateMetadata] Error generating metadata:", error);
    return {
      title: "Error Loading Location",
      description: "There was an error loading the climbing location.",
    };
  }
}

// Pre-render top crags at build time (optional - comment out for faster builds)
export async function generateStaticParams() {
  try {
    // Fetch top 50 crags from database
    const crags = await searchCrags("");

    if (!crags || crags.length === 0) {
      return [];
    }

    // Generate slugs for pre-rendering
    return crags.slice(0, 50).map((crag) => ({
      slug: generateSlug(crag.name),
    }));
  } catch (error) {
    console.error("Failed to generate static params:", error);
    return [];
  }
}

// Main page component
export default async function LocationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Fetch all data
  const data = await getCragData(slug);

  if (!data) {
    notFound();
  }

  return (
    <CragPageContent
      crag={data.crag}
      conditions={data.conditions}
      reports={data.reports}
      sectors={data.sectors}
    />
  );
}
