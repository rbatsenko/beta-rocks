import { notFound } from "next/navigation";
import { Metadata } from "next";
import { CragPageContent } from "@/components/crag/CragPageContent";
import {
  fetchCragBySlug,
  fetchCragById,
  fetchSectorsByCrag,
  findCragByCoordinates,
} from "@/lib/db/queries";
import { parseCoordinatesFromSlug } from "@/lib/utils/slug";
import { getCountryName } from "@/lib/utils/country-flags";

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
    parts.push(getCountryName(crag.country));
  }

  return parts.length > 0 ? parts.join(", ") : "Unknown location";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  let crag = null;
  let sector = null;

  // Try direct slug lookup first
  crag = await fetchCragBySlug(slug);

  // Check if the found crag is actually a sector (has parent_crag_id)
  if (crag && crag.parent_crag_id) {
    sector = crag;
    // Fetch the parent crag
    crag = await fetchCragById(crag.parent_crag_id);
  }

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
  const displayName = sector ? `${sector.name} • ${crag.name}` : crag.name;
  const title = `${displayName} - Conditions & Community Reports | beta.rocks`;
  const description = `Climbing conditions and community reports for ${displayName} in ${location}. Real-time weather, friction scores, and info from fellow climbers for planning your session.`;

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
      images: [
        {
          url: "https://beta.rocks/opengraph-image.jpg",
          width: 1200,
          height: 630,
          alt: `${displayName} climbing conditions and community reports`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://beta.rocks/opengraph-image.jpg"],
    },
  };
}

export default async function LocationPage({ params }: PageProps) {
  const { slug } = await params;

  console.log(`[LocationPage] Processing slug: ${slug}`);

  let crag = null;
  let sector = null;

  // Try direct slug lookup first
  crag = await fetchCragBySlug(slug);

  // Check if the found crag is actually a sector (has parent_crag_id)
  if (crag && crag.parent_crag_id) {
    console.log(`[LocationPage] Found sector (crag with parent): ${crag.name}`);
    sector = crag;
    // Fetch the parent crag
    crag = await fetchCragById(crag.parent_crag_id);
    console.log(`[LocationPage] Parent crag: ${crag?.name}`);
  }

  // Fallback to coordinate-based slug parsing
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

  // Pass crag, sectors, and current sector (if viewing a sector) to client component
  // Client component will fetch conditions and reports in parallel with React Query
  return <CragPageContent crag={crag} sectors={sectors} currentSector={sector} />;
}
