/**
 * URL generation utilities for external services
 */

/**
 * Generate SunCalc.org URL for sun position/shadow analysis
 * @param latitude - Location latitude
 * @param longitude - Location longitude
 * @param date - Optional date (defaults to today)
 * @param time - Optional time in HH:MM format (defaults to 12:00)
 * @param zoom - Optional zoom level (defaults to 17 for detailed view)
 * @returns SunCalc URL or null if coordinates are missing
 */
export function getSunCalcUrl(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  date?: Date,
  time: string = "12:00",
  zoom: number = 17
): string | null {
  if (!latitude || !longitude) return null;

  const targetDate = date || new Date();
  const dateStr = targetDate.toISOString().split("T")[0].replace(/-/g, "."); // YYYY.MM.DD format

  // URL format: https://www.suncalc.org/#/lat,lng,zoom/date/time/mapType/layer
  // mapType: 1 = terrain
  // layer: 1 = satellite (better for seeing rock faces and shadow patterns)
  return `https://www.suncalc.org/#/${latitude.toFixed(4)},${longitude.toFixed(4)},${zoom}/${dateStr}/${time}/1/1`;
}

/**
 * Generate OpenStreetMap URL for a location
 * @param latitude - Location latitude
 * @param longitude - Location longitude
 * @param zoom - Optional zoom level (defaults to 15)
 * @returns OpenStreetMap URL or null if coordinates are missing
 */
export function getOpenStreetMapUrl(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  zoom: number = 15
): string | null {
  if (!latitude || !longitude) return null;

  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`;
}

/**
 * Generate OpenStreetMap embed URL for iframe
 * @param latitude - Location latitude
 * @param longitude - Location longitude
 * @param bboxSize - Size of bounding box (defaults to 0.01 degrees, ~1km)
 * @returns OpenStreetMap embed URL or null if coordinates are missing
 */
export function getOpenStreetMapEmbedUrl(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  bboxSize: number = 0.01
): string | null {
  if (!latitude || !longitude) return null;

  const minLon = longitude - bboxSize;
  const minLat = latitude - bboxSize;
  const maxLon = longitude + bboxSize;
  const maxLat = latitude + bboxSize;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon},${minLat},${maxLon},${maxLat}&layer=mapnik&marker=${latitude},${longitude}`;
}

/**
 * Generate Google Maps URL for a location
 * @param latitude - Location latitude
 * @param longitude - Location longitude
 * @param zoom - Optional zoom level (defaults to 15)
 * @returns Google Maps URL or null if coordinates are missing
 */
export function getGoogleMapsUrl(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  zoom: number = 15
): string | null {
  if (!latitude || !longitude) return null;

  return `https://www.google.com/maps?q=${latitude},${longitude}&z=${zoom}`;
}
