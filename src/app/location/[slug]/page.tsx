import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  searchCrags,
  findCragByCoordinates,
} from "@/lib/db/queries";
import { generateSlug, generateUniqueSlug, parseCoordinatesFromSlug, getBaseSlug } from "@/lib/utils/slug";
import { CragConditionsClient } from "@/components/CragConditionsClient";

// Enable ISR with 5-minute revalidation
export const revalidate = 300;

// Fetch crag by slug (server-side only, for SEO)
async function getCragBySlug(slug: string) {
  console.log(`[getCragBySlug] Processing slug: ${slug}`);

  // OPTIMIZATION: Try coordinate lookup first (fast and precise)
  const coords = parseCoordinatesFromSlug(slug);
  if (coords) {
    console.log(`[getCragBySlug] Found coordinates in slug: ${coords.lat}, ${coords.lon}`);
    const crag = await findCragByCoordinates(coords.lat, coords.lon, 0.01);
    if (crag) {
      console.log(`[getCragBySlug] Found crag by coordinates: ${crag.name}`);
      return crag;
    }
  }

  // Fallback: name-based search (for legacy URLs without coordinates)
  const baseSlug = getBaseSlug(slug);
  const slugParts = baseSlug.split("-");
  const searchName = slugParts[slugParts.length - 1];

  console.log(`[getCragBySlug] Searching by name: "${searchName}"`);

  const results = await searchCrags(searchName);

  if (results && results.length > 0) {
    console.log(`[getCragBySlug] Found ${results.length} results by name`);

    if (results.length === 1) {
      return results[0];
    }

    // Try exact slug match
    const exactMatch = results.find((crag) => generateSlug(crag.name) === baseSlug);
    if (exactMatch) {
      return exactMatch;
    }

    return results[0];
  }

  return null;
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const crag = await getCragBySlug(slug);

    if (!crag) {
      return {
        title: "Location Not Found",
        description: "The climbing location you are looking for could not be found.",
      };
    }

    const location = [crag.municipality, crag.state, crag.country].filter(Boolean).join(", ");

    return {
      title: `${crag.name} - Real-time Climbing Conditions | beta.rocks`,
      description: `Live conditions for ${crag.name}${location ? ` in ${location}` : ""}. Check real-time weather, friction, and community reports.`,
      openGraph: {
        title: `${crag.name} Climbing Conditions`,
        description: `Real-time climbing conditions for ${crag.name}. ${crag.rock_type ? `${crag.rock_type} rock.` : ""}`,
        type: "website",
        locale: "en_US",
        siteName: "beta.rocks",
      },
      twitter: {
        card: "summary_large_image",
        title: `${crag.name} Climbing Conditions`,
        description: `Check live conditions at ${crag.name}`,
      },
      alternates: {
        canonical: `/location/${slug}`,
      },
    };
  } catch (error) {
    console.error("[generateMetadata] Error:", error);
    return {
      title: "Error Loading Location",
      description: "There was an error loading the climbing location.",
    };
  }
}

// Generate static params for all crags (SEO optimization)
export async function generateStaticParams() {
  try {
    // Fetch all crags from database
    const crags = await searchCrags("");

    if (!crags || crags.length === 0) {
      return [];
    }

    console.log(`[generateStaticParams] Generating paths for ${crags.length} crags`);

    // Generate unique slugs with coordinates for all crags
    // This ensures each crag gets a unique URL and fast lookups
    return crags.map((crag) => ({
      slug: generateUniqueSlug(crag.name, crag.lat, crag.lon),
    }));
  } catch (error) {
    console.error("[generateStaticParams] Error:", error);
    return [];
  }
}

// Main page component (server component for SEO)
export default async function LocationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Fetch only crag data server-side (fast DB query, no API calls)
  const crag = await getCragBySlug(slug);

  if (!crag) {
    notFound();
  }

  // Return static HTML with crag info + client component for weather
  return <CragConditionsClient crag={crag} />;
}
