import { notFound } from "next/navigation";
import { CragPageContent } from "@/components/CragPageContent";
import { fetchCragBySlug, fetchSectorsByCrag, findCragByCoordinates } from "@/lib/db/queries";
import { parseCoordinatesFromSlug } from "@/lib/utils/slug";

// Enable ISR with 5-minute revalidation
export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
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
