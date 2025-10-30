import { notFound } from "next/navigation";
import { Metadata } from "next";
import { CragPageContent } from "@/components/CragPageContent";
import { fetchCragBySlug, fetchSectorsByCrag, findCragByCoordinates } from "@/lib/db/queries";
import { parseCoordinatesFromSlug } from "@/lib/utils/slug";

// Enable ISR with 5-minute revalidation
export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Helper function to get location string
function getLocationString(crag: any): string {
  const parts = [];

  if (crag.municipality) parts.push(crag.municipality);
  else if (crag.village) parts.push(crag.village);

  if (crag.state) parts.push(crag.state);
  if (crag.country) {
    // Convert country code to name if possible
    const countryNames: Record<string, string> = {
      US: "United States",
      FR: "France",
      IT: "Italy",
      ES: "Spain",
      DE: "Germany",
      PL: "Poland",
      CZ: "Czech Republic",
      SK: "Slovakia",
      AT: "Austria",
      CH: "Switzerland",
      SI: "Slovenia",
      HR: "Croatia",
      GB: "United Kingdom",
      UK: "United Kingdom",
      BE: "Belgium",
      NL: "Netherlands",
      NO: "Norway",
      SE: "Sweden",
      FI: "Finland",
      DK: "Denmark",
      PT: "Portugal",
      GR: "Greece",
      BG: "Bulgaria",
      RO: "Romania",
      HU: "Hungary",
      RS: "Serbia",
      BA: "Bosnia and Herzegovina",
      ME: "Montenegro",
      MK: "North Macedonia",
      AL: "Albania",
      TR: "Turkey",
      CA: "Canada",
      AU: "Australia",
      NZ: "New Zealand",
      ZA: "South Africa",
      TH: "Thailand",
      JP: "Japan",
      CN: "China",
      AR: "Argentina",
      CL: "Chile",
      BR: "Brazil",
      MX: "Mexico",
    };
    parts.push(countryNames[crag.country] || crag.country);
  }

  return parts.length > 0 ? parts.join(", ") : "Unknown location";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  let crag = null;

  // Try direct slug lookup first
  crag = await fetchCragBySlug(slug);

  // Fallback to coordinate-based lookup
  if (!crag) {
    const coords = parseCoordinatesFromSlug(slug);
    if (coords) {
      crag = await findCragByCoordinates(coords.lat, coords.lon, 0.01);
    }
  }

  // Default metadata if crag not found
  if (!crag) {
    return {
      title: "Crag Not Found | beta.rocks",
      description: "The climbing crag you're looking for could not be found.",
    };
  }

  const location = getLocationString(crag);
  const title = `${crag.name} - Conditions & Community Reports | beta.rocks`;
  const description = `Climbing conditions and community reports for ${crag.name} in ${location}. Real-time weather, friction scores, and info from fellow climbers for planning your session.`;

  return {
    title,
    description,
    keywords: [
      crag.name,
      "climbing conditions",
      "community reports",
      "climbing info",
      "rock climbing",
      "friction score",
      "weather forecast",
      location,
      "crag conditions",
      "climber reports",
      crag.rock_type,
    ].filter((keyword): keyword is string => Boolean(keyword)),
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://beta.rocks/location/${slug}`,
      siteName: "beta.rocks",
      locale: "en_US",
      // Images are auto-generated from /src/app/opengraph-image.jpg by Next.js
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      // Images are auto-generated from /src/app/opengraph-image.jpg by Next.js
    },
  };
}

export default async function LocationPage({ params }: PageProps) {
  const { slug } = await params;

  console.log(`[LocationPage] Processing slug: ${slug}`);

  let crag = null;

  // Try direct slug lookup first (new system)
  crag = await fetchCragBySlug(slug);

  // Fallback to old coordinate-based slug parsing for backward compatibility
  if (!crag) {
    const coords = parseCoordinatesFromSlug(slug);
    if (coords) {
      console.log(`[LocationPage] Falling back to coordinate lookup`);
      crag = await findCragByCoordinates(coords.lat, coords.lon, 0.01);
    }
  }

  if (!crag) {
    console.log(`[LocationPage] Crag not found for slug: ${slug}`);
    notFound();
  }

  console.log(`[LocationPage] Found crag: ${crag.name} (${crag.id})`);

  // Fetch sectors server-side (fast database query)
  const sectors = await fetchSectorsByCrag(crag.id).catch(() => []);

  console.log(`[LocationPage] Loaded ${sectors.length} sectors`);

  // Pass crag and sectors to client component
  // Client component will fetch conditions and reports in parallel with React Query
  return <CragPageContent crag={crag} sectors={sectors} />;
}
