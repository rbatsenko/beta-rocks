/**
 * Slug Generation Utilities
 *
 * Converts location names to URL-friendly slugs and vice versa
 */

/**
 * Generate a URL-friendly slug from a location name
 * @example "Fontainebleau - Bas Cuvier" → "fontainebleau-bas-cuvier"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD") // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^\w\s-]/g, "") // Remove non-word chars (except spaces and hyphens)
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Collapse multiple hyphens
}

/**
 * Reverse a slug back to a display name (title case)
 * @example "fontainebleau-bas-cuvier" → "Fontainebleau Bas Cuvier"
 */
export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Generate a unique slug by appending coordinates if needed
 * Useful for crags with the same name in different locations
 * @example "el-capitan-37-72--119-64" for El Capitan at 37.72, -119.64
 */
export function generateUniqueSlug(name: string, lat: number, lon: number): string {
  const baseSlug = generateSlug(name);
  const latRounded = lat.toFixed(2).replace(".", "-").replace("--", "-minus-");
  const lonRounded = lon.toFixed(2).replace(".", "-").replace("--", "-minus-");

  return `${baseSlug}-${latRounded}--${lonRounded}`;
}

/**
 * Parse coordinates from a unique slug
 * @returns { lat, lon } or null if not a coordinate-based slug
 */
export function parseCoordinatesFromSlug(slug: string): { lat: number; lon: number } | null {
  console.log(`[parseCoordinatesFromSlug] Parsing slug: ${slug}`);

  // Split by -- to separate lat and lon
  const parts = slug.split("--");
  if (parts.length < 2) {
    console.log(`[parseCoordinatesFromSlug] No -- separator found`);
    return null;
  }

  const lonPart = parts[parts.length - 1]; // Last part is lon
  const beforeLon = parts.slice(0, -1).join("--"); // Everything before lon

  console.log(`[parseCoordinatesFromSlug] beforeLon: ${beforeLon}, lonPart: ${lonPart}`);

  // For lat, find the last -digits-digits pattern (after the base slug)
  const latPattern = /-(\d+-\d+)$/;
  const latMatch = beforeLon.match(latPattern);

  if (!latMatch) {
    console.log(`[parseCoordinatesFromSlug] No lat pattern found in: ${beforeLon}`);
    return null;
  }

  const latPart = latMatch[1];
  console.log(`[parseCoordinatesFromSlug] latPart: ${latPart}, lonPart: ${lonPart}`);

  // Parse coordinates (replace hyphen with decimal point)
  // Handle "minus-" prefix for negative numbers
  const lat = parseFloat(latPart.replace(/minus-/g, "-").replace(/-/g, "."));
  const lon = parseFloat(lonPart.replace(/minus-/g, "-").replace(/-/g, "."));

  console.log(`[parseCoordinatesFromSlug] Parsed lat: ${lat}, lon: ${lon}`);

  if (isNaN(lat) || isNaN(lon)) {
    console.log(`[parseCoordinatesFromSlug] Failed to parse coordinates (NaN)`);
    return null;
  }

  return { lat, lon };
}

/**
 * Extract base name from a unique slug (removes coordinates)
 * @example "el-capitan-37-72--119-64" → "el-capitan"
 */
export function getBaseSlug(slug: string): string {
  return slug.replace(/(-?\d+-\d+)--(-?\d+-\d+)$/, "");
}

/**
 * Generate a slug from a crag object (prefers stored slug field)
 * Falls back to coordinate-based slug for backward compatibility
 * @param crag - Crag object with slug, name, lat, lon
 * @returns SEO-friendly slug
 */
export function getCragSlug(crag: {
  slug?: string | null;
  name: string;
  lat: number;
  lon: number;
}): string {
  // Prefer stored slug from database
  if (crag.slug) {
    return crag.slug;
  }

  // Fallback to coordinate-based slug (old system)
  console.warn(
    `[getCragSlug] Crag "${crag.name}" missing slug field, generating coordinate-based slug`
  );
  return generateUniqueSlug(crag.name, crag.lat, crag.lon);
}
