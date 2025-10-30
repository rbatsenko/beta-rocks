import { streamText, tool, convertToModelMessages, UIMessage, stepCountIs, smoothStream } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { searchLocationMultiple } from "@/lib/external-apis/geocoding";
import { getWeatherForecast } from "@/lib/external-apis/open-meteo";
import { computeConditions, RockType } from "@/lib/conditions/conditions.service";
import {
  searchAreas,
  formatAreaPath,
  extractRockType,
  isCrag,
  hasPreciseCoordinates,
} from "@/lib/openbeta/client";
import { searchCrags, findOrCreateCrag, fetchReportsByCrag } from "@/lib/db/queries";
import { resolveLocale } from "@/lib/i18n/config";
import { getSystemPrompt } from "./prompts";
import {
  logChatInteraction,
  extractMetadataFromToolResults,
  calculateGeminiCost,
} from "@/lib/observability/chat-logger";
import { createClient } from "@supabase/supabase-js";
import type { UnitsConfig } from "@/lib/units/types";
import { getWindSpeedSymbol } from "@/lib/units/conversions";

export const maxDuration = 30;

// Define tools for the AI model using Zod schemas
const tools = {
  get_conditions: tool({
    description: "Get climbing conditions for a crag, sector, or route",
    inputSchema: z.object({
      location: z.string().describe("Name of the crag, sector, or route"),
      timeframe: z.string().optional().describe("When? (today, tomorrow, this week, etc)"),
      latitude: z.number().optional().describe("Latitude of the location"),
      longitude: z.number().optional().describe("Longitude of the location"),
      rockType: z
        .enum(["granite", "sandstone", "limestone", "basalt", "gneiss", "quartzite", "unknown"])
        .optional()
        .describe("Type of rock at the crag"),
    }),
    execute: async ({ location, latitude, longitude, rockType, timeframe }) => {
      console.log("[get_conditions] Starting tool execution:", {
        location,
        latitude,
        longitude,
        rockType,
        timeframe,
      });

      let lat = latitude;
      let lon = longitude;
      let detectedRockType = rockType;
      let locationDetails = ""; // Will store "Region, Country" or path from OpenBeta
      let country: string | undefined = undefined;
      let state: string | undefined = undefined;
      let municipality: string | undefined = undefined;
      let village: string | undefined = undefined;
      let description: string | undefined = undefined;
      let aspects: number[] | undefined = undefined;
      let climbingTypes: string[] | undefined = undefined;
      let cragId: string | undefined = undefined;
      let cragSlug: string | undefined = undefined;

      // If no coordinates provided, search for location
      if (!lat || !lon) {
        // STEP 1: Try local database first (fastest, most customized)
        try {
          console.log(
            "[get_conditions] No coordinates provided, trying local database search:",
            location
          );

          const localCrags = await searchCrags(location);
          console.log("[get_conditions] Local database results:", {
            location,
            count: localCrags?.length || 0,
          });

          if (localCrags && localCrags.length > 0) {
            if (localCrags.length === 1) {
              // Single crag/sector found locally
              const result = localCrags[0];

              // Check if metadata is complete (country, state, municipality, or village present)
              const hasCompleteMetadata = !!(result.country || result.state || result.municipality || result.village);

              if (!hasCompleteMetadata) {
                // Metadata incomplete - could be ambiguous place name, cross-check with geocoding
                console.log("[get_conditions] Single result has incomplete metadata, checking for ambiguous place name");

                try {
                  const geocodedMultiple = await searchLocationMultiple(location, 5);

                  if (geocodedMultiple && geocodedMultiple.length > 1) {
                    // Found multiple places with this name - show disambiguation
                    console.log("[get_conditions] Found multiple locations in geocoding, returning disambiguation");

                    return {
                      disambiguate: true,
                      source: "geocoding",
                      message: `Found multiple locations for "${location}". Please choose one:`,
                      translationKey: "disambiguation.foundMultipleLocations",
                      translationParams: { location },
                      options: geocodedMultiple.map((result) => {
                        // Build location string with region and country
                        const locationParts = [];
                        if (result.admin1) locationParts.push(result.admin1); // State/Region
                        if (result.country) locationParts.push(result.country);

                        return {
                          id: `${result.latitude},${result.longitude}`,
                          name: result.name,
                          location: locationParts.join(", ") || "Unknown",
                          latitude: result.latitude,
                          longitude: result.longitude,
                          cragSlug: null, // Geocoding results don't have slugs
                        };
                      }),
                    };
                  }

                  console.log("[get_conditions] Geocoding returned ≤1 result, using local DB crag");
                } catch (geocodingError) {
                  console.log("[get_conditions] Geocoding cross-check failed, using local DB crag:", {
                    error: geocodingError instanceof Error ? geocodingError.message : String(geocodingError),
                  });
                  // Fall through to use local result
                }
              }

              // Use local DB result (metadata complete OR geocoding confirmed single location)
              lat = result.lat;
              lon = result.lon;
              cragId = result.id; // Capture crag ID for fetching reports
              // Capture slug for URL generation (use parent_crag_slug for sectors)
              const isSector = "result_type" in result && result.result_type === "sector";
              cragSlug =
                isSector && "parent_crag_slug" in result
                  ? result.parent_crag_slug || undefined
                  : result.slug || undefined;
              detectedRockType = (detectedRockType || (result.rock_type as RockType)) as RockType;

              // Capture detailed location data
              country = result.country || undefined;
              state = result.state || undefined;
              municipality = result.municipality || undefined;
              village = result.village || undefined;

              // Capture metadata for AI context
              // For sectors, include parent crag description (e.g., Fontainebleau sandstone warning)
              const parentDesc =
                isSector && "parent_crag_description" in result
                  ? result.parent_crag_description
                  : null;

              if (isSector && parentDesc) {
                // Combine sector description + parent crag description (parent desc has critical safety info)
                const sectorDesc = result.description || "";
                const parentDescStr = String(parentDesc);
                description = sectorDesc ? `${sectorDesc}\n\n${parentDescStr}` : parentDescStr;
              } else {
                description = result.description || undefined;
              }

              // aspects is only available on crags, not sectors (search_locations_unaccent doesn't include it)
              aspects = "aspects" in result ? (result.aspects as number[] | undefined) : undefined;
              climbingTypes = result.climbing_types || undefined;

              // Build locationDetails from available fields
              const locationParts = [];
              if (village) locationParts.push(village);
              if (municipality && municipality !== village) locationParts.push(municipality);
              if (state) locationParts.push(state);
              if (country) locationParts.push(country);
              locationDetails = locationParts.join(", ");

              console.log("[get_conditions] Using local database result:", {
                name: result.name,
                resultType: "result_type" in result ? result.result_type : "crag",
                lat,
                lon,
                country,
                state,
                municipality,
                village,
                rockType: detectedRockType,
                description,
                aspects,
                climbingTypes,
              });
            } else if (localCrags.length > 1) {
              // Multiple crags/sectors found locally - return disambiguation
              console.log(
                "[get_conditions] Multiple crags/sectors found in local DB, returning disambiguation"
              );

              return {
                disambiguate: true,
                source: "local",
                message: `Found ${localCrags.length} climbing areas for "${location}" in our database. Please choose one:`,
                translationKey: "disambiguation.foundMultipleAreas",
                translationParams: { count: localCrags.length, location },
                options: localCrags.map((item) => {
                  // Check if this is a sector (has result_type field from search_locations_unaccent)
                  const isSector = "result_type" in item && item.result_type === "sector";
                  const locationLabel =
                    isSector && "parent_crag_name" in item
                      ? item.parent_crag_name // Show parent crag for sectors
                      : item.country; // Show country for crags

                  // Use parent_crag_slug for sectors, slug for crags
                  const slug =
                    isSector && "parent_crag_slug" in item ? item.parent_crag_slug : item.slug;

                  return {
                    id: item.id,
                    name: item.name,
                    location: locationLabel,
                    latitude: item.lat,
                    longitude: item.lon,
                    rockType: item.rock_type || "unknown",
                    cragSlug: slug || null,
                  };
                }),
              };
            }
          }
        } catch (error) {
          console.log("[get_conditions] Local database search failed, will try OpenBeta:", {
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue to OpenBeta fallback
        }

        // STEP 2: Try OpenBeta (climbing-specific database)
        if (!lat || !lon) {
          try {
            console.log("[get_conditions] No local match found, trying OpenBeta search:", location);

            const openBetaAreas = await searchAreas(location);
            console.log("[get_conditions] OpenBeta results:", {
              location,
              count: openBetaAreas.length,
            });

            if (openBetaAreas.length > 0) {
              // Filter to actual climbing crags (not countries/regions)
              // Also filter out areas with generic coordinates
              const crags = openBetaAreas.filter((area) => {
                const isPrecise = hasPreciseCoordinates(area);
                const isCragArea = isCrag(area);
                console.log("[get_conditions] Area check:", {
                  name: area.area_name,
                  coords: `${area.metadata?.lat}, ${area.metadata?.lng}`,
                  isPrecise,
                  isCrag: isCragArea,
                  keep: isPrecise && isCragArea,
                });
                return isPrecise && isCragArea;
              });
              console.log("[get_conditions] Filtered to crags:", {
                original: openBetaAreas.length,
                crags: crags.length,
              });

              if (crags.length === 1) {
                // Perfect! Single crag found
                const crag = crags[0];
                lat = crag.metadata.lat;
                lon = crag.metadata.lng;
                detectedRockType = (detectedRockType || extractRockType(crag)) as RockType;
                locationDetails = formatAreaPath(crag); // e.g., "Spain > Siurana > El Pati"

                console.log("[get_conditions] Using OpenBeta crag:", {
                  name: crag.area_name,
                  path: formatAreaPath(crag),
                  lat,
                  lon,
                  rockType: detectedRockType,
                });
              } else if (crags.length > 1) {
                // Multiple crags found - return disambiguation
                console.log("[get_conditions] Multiple crags found, returning disambiguation");

                // Sort by popularity (number of climbs) - more popular crags first
                const sortedCrags = [...crags].sort((a, b) => {
                  const aClimbCount = (a.climbs?.length || 0) + (a.children?.length || 0);
                  const bClimbCount = (b.climbs?.length || 0) + (b.children?.length || 0);
                  return bClimbCount - aClimbCount; // Descending order
                });

                return {
                  disambiguate: true,
                  source: "openbeta",
                  message: `Found ${crags.length} climbing areas for "${location}". Please choose one:`,
                  translationKey: "disambiguation.foundMultipleAreas",
                  translationParams: { count: crags.length, location },
                  options: sortedCrags.map((crag) => ({
                    id: crag.uuid,
                    name: crag.area_name,
                    location: formatAreaPath(crag),
                    latitude: crag.metadata.lat,
                    longitude: crag.metadata.lng,
                    rockType: extractRockType(crag),
                    cragSlug: null, // OpenBeta areas don't have slugs yet
                  })),
                };
              }
            }
          } catch (error) {
            console.log("[get_conditions] OpenBeta search failed, will try geocoding:", {
              error: error instanceof Error ? error.message : String(error),
            });
            // Continue to geocoding fallback
          }
        }

        // STEP 3: If OpenBeta didn't find a crag, fall back to geocoding
        if (!lat || !lon) {
          try {
            console.log("[get_conditions] Falling back to geocoding API:", location);
            // First try to get multiple results for disambiguation
            const geocodedMultiple = await searchLocationMultiple(location, 3);

            console.log("[get_conditions] Geocoding results:", {
              location,
              resultsCount: geocodedMultiple?.length || 0,
            });

            if (!geocodedMultiple || geocodedMultiple.length === 0) {
              console.error("[get_conditions] No geocoding results found for:", location);
              return {
                error: `Could not find location: ${location}`,
                location,
              };
            }

            // If multiple results, return them for user to choose
            if (geocodedMultiple.length > 1) {
              console.log(
                "[get_conditions] Multiple results found, returning disambiguation options"
              );
              return {
                disambiguate: true,
                source: "geocoding",
                message: `Found multiple locations for "${location}". Please choose one:`,
                translationKey: "disambiguation.foundMultipleLocations",
                translationParams: { location },
                options: geocodedMultiple.map((result) => {
                  // Build location string with region and country
                  const locationParts = [];
                  if (result.admin1) locationParts.push(result.admin1); // State/Region
                  if (result.country) locationParts.push(result.country);

                  return {
                    id: `${result.latitude},${result.longitude}`,
                    name: result.name,
                    location: locationParts.join(", ") || "Unknown",
                    latitude: result.latitude,
                    longitude: result.longitude,
                    cragSlug: null, // Geocoding results don't have slugs
                  };
                }),
              };
            }

            // Use the single result
            const geocoded = geocodedMultiple[0];
            lat = geocoded.latitude;
            lon = geocoded.longitude;

            // Build location details string
            const locationParts = [];
            if (geocoded.admin1) locationParts.push(geocoded.admin1);
            if (geocoded.country) locationParts.push(geocoded.country);
            locationDetails = locationParts.join(", ");

            console.log("[get_conditions] Using geocoded coordinates:", {
              lat,
              lon,
              name: geocoded.name,
              details: locationDetails,
            });
          } catch (error) {
            console.error("[get_conditions] Geocoding error:", {
              location,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            });
            return {
              error: `Failed to search for location: ${location}`,
              location,
            };
          }
        }
      }

      // STEP 3.5: If we have coordinates (e.g., from disambiguation), try exact match in DB
      // This is critical for sectors to get parent crag descriptions
      if (lat && lon && !description) {
        try {
          console.log("[get_conditions] Coordinates provided, checking for exact match in DB:", {
            lat,
            lon,
          });

          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);

            // Check sectors first (more specific than crags)
            const { data: sectors } = await supabase
              .from("sectors")
              .select(
                `
                *,
                parent_crag:crags!sectors_crag_id_fkey(
                  name,
                  description,
                  rock_type,
                  climbing_types,
                  aspects,
                  slug
                )
              `
              )
              .eq("lat", lat)
              .eq("lon", lon)
              .limit(1);

            if (sectors && sectors.length > 0) {
              const sector = sectors[0];
              console.log("[get_conditions] Found exact sector match:", {
                name: sector.name,
                hasParent: !!sector.parent_crag,
              });

              // Enrich with parent crag data
              if (sector.parent_crag) {
                const parent = Array.isArray(sector.parent_crag)
                  ? sector.parent_crag[0]
                  : sector.parent_crag;

                // Combine sector + parent descriptions (parent has safety warnings)
                const sectorDesc = sector.description || "";
                const parentDesc = parent.description || "";
                description =
                  sectorDesc && parentDesc
                    ? `${sectorDesc}\n\n${parentDesc}`
                    : parentDesc || sectorDesc || undefined;

                // Use parent's rock type if we don't have one
                if ((!detectedRockType || detectedRockType === "unknown") && parent.rock_type) {
                  detectedRockType = parent.rock_type as RockType;
                }

                // Use parent's climbing types and aspects
                if (parent.climbing_types && parent.climbing_types.length > 0) {
                  climbingTypes = parent.climbing_types;
                }
                if (parent.aspects && parent.aspects.length > 0) {
                  aspects = parent.aspects;
                }

                // Capture parent crag slug for URL generation
                if (parent.slug) {
                  cragSlug = parent.slug;
                }

                console.log("[get_conditions] Enriched with parent crag data:", {
                  parentName: parent.name,
                  rockType: detectedRockType,
                  hasDescription: !!description,
                  hasAspects: !!aspects,
                });
              }
            } else {
              // Try crags table if no sector match
              const { data: crags } = await supabase
                .from("crags")
                .select("*")
                .eq("lat", lat)
                .eq("lon", lon)
                .limit(1);

              if (crags && crags.length > 0) {
                const crag = crags[0];
                console.log("[get_conditions] Found exact crag match:", {
                  name: crag.name,
                });

                description = crag.description || undefined;
                if ((!detectedRockType || detectedRockType === "unknown") && crag.rock_type) {
                  detectedRockType = crag.rock_type as RockType;
                }
                if (crag.climbing_types && crag.climbing_types.length > 0) {
                  climbingTypes = crag.climbing_types;
                }
                if (crag.aspects && crag.aspects.length > 0) {
                  aspects = crag.aspects;
                }
                // Capture crag slug for URL generation
                if (crag.slug) {
                  cragSlug = crag.slug;
                }
              }
            }
          }
        } catch (error) {
          console.log("[get_conditions] Exact match lookup failed (non-critical):", {
            error: error instanceof Error ? error.message : String(error),
          });
          // Non-critical - continue without enrichment
        }
      }

      // STEP 4: If we have coordinates but missing metadata, try reverse lookup in local DB
      if (lat && lon && (!country || !detectedRockType || detectedRockType === "unknown")) {
        try {
          console.log("[get_conditions] Enriching location data via reverse lookup:", {
            lat,
            lon,
          });

          // Create server-side Supabase client for coordinate-based search
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);

            // Use PostGIS to find crags within 1km radius (0.01 degrees ≈ 1.1km)
            const { data: nearbyCreags, error: geoError } = await supabase.rpc(
              "find_nearby_crags",
              {
                search_lat: lat,
                search_lon: lon,
                radius_degrees: 0.01,
              }
            );

            if (geoError) {
              console.log("[get_conditions] PostGIS function not available, using simple query");
              // Fallback to simple bounding box query
              const latRange = 0.01; // ~1km
              const lonRange = 0.01;
              const { data: fallbackCreags } = await supabase
                .from("crags")
                .select("*")
                .gte("lat", (lat - latRange).toString())
                .lte("lat", (lat + latRange).toString())
                .gte("lon", (lon - lonRange).toString())
                .lte("lon", (lon + lonRange).toString())
                .limit(5);

              if (fallbackCreags && fallbackCreags.length > 0) {
                const closestCrag = fallbackCreags[0];
                enrichMetadata(closestCrag);
              }
            } else if (nearbyCreags && nearbyCreags.length > 0) {
              console.log("[get_conditions] Reverse lookup results:", {
                count: nearbyCreags.length,
              });
              const closestCrag = nearbyCreags[0];
              enrichMetadata(closestCrag);
            }
          }

          // Helper function to enrich metadata from a crag record
          function enrichMetadata(crag: {
            country?: string | null;
            state?: string | null;
            municipality?: string | null;
            village?: string | null;
            rock_type?: string | null;
            description?: string | null;
            aspects?: number[] | null;
            climbing_types?: string[] | null;
          }) {
            // Only update if we don't have these values yet
            if (!country && crag.country) country = crag.country;
            if (!state && crag.state) state = crag.state;
            if (!municipality && crag.municipality) municipality = crag.municipality;
            if (!village && crag.village) village = crag.village;

            if ((!detectedRockType || detectedRockType === "unknown") && crag.rock_type) {
              detectedRockType = crag.rock_type as RockType;
            }

            // Capture crag-specific metadata for AI context
            if (crag.description) description = crag.description;
            if (crag.aspects && crag.aspects.length > 0) aspects = crag.aspects;
            if (crag.climbing_types && crag.climbing_types.length > 0)
              climbingTypes = crag.climbing_types;

            // Build locationDetails if we don't have it yet
            if (!locationDetails) {
              const locationParts = [];
              if (village) locationParts.push(village);
              if (municipality && municipality !== village) locationParts.push(municipality);
              if (state) locationParts.push(state);
              if (country) locationParts.push(country);
              locationDetails = locationParts.join(", ");
            }

            console.log("[get_conditions] Enriched with reverse lookup:", {
              country,
              state,
              municipality,
              village,
              rockType: detectedRockType,
              description,
              aspects,
              climbingTypes,
              locationDetails,
            });
          }
        } catch (error) {
          console.log("[get_conditions] Reverse lookup failed (non-critical):", {
            error: error instanceof Error ? error.message : String(error),
          });
          // Non-critical - continue without enrichment
        }
      }

      try {
        console.log("[get_conditions] Fetching weather forecast:", {
          location,
          lat,
          lon,
          rockType: detectedRockType,
        });

        // Call the weather API directly instead of making an HTTP request
        const forecast = await getWeatherForecast(lat, lon, 14);

        console.log("[get_conditions] Weather forecast received:", {
          location,
          hasCurrent: !!forecast.current,
          hasHourly: !!forecast.hourly,
        });

        if (!forecast.current || !forecast.hourly) {
          console.error("[get_conditions] Invalid forecast data structure");
          return {
            error: "Invalid forecast data structure",
            location,
          };
        }

        // Prepare hourly data with weather codes
        // Filter to only include current hour and future hours
        const now = new Date();
        const hourlyData = forecast.hourly
          .filter((h) => new Date(h.time) >= now)
          .map((h) => ({
            time: h.time,
            temp_c: h.temperature,
            humidity: h.humidity,
            wind_kph: h.windSpeed,
            precip_mm: h.precipitation,
            weatherCode: h.weatherCode,
          }));

        // Find max temperature from forecast for context detection
        const maxDailyTemp = Math.max(...hourlyData.slice(0, 24).map((h) => h.temp_c));

        // Compute conditions - include ALL hours (including night) for UI to filter
        const conditions = computeConditions(
          {
            current: {
              temp_c: forecast.current.temperature,
              humidity: forecast.current.humidity,
              wind_kph: forecast.current.windSpeed,
              precip_mm: forecast.current.precipitation,
            },
            hourly: hourlyData,
            latitude: lat,
            longitude: lon,
            maxDailyTemp,
          },
          (detectedRockType as RockType) || "unknown",
          0,
          { includeNightHours: true } // Send all hours to frontend
        );

        console.log("[get_conditions] Successfully computed conditions:", {
          location,
          rating: conditions.rating,
          frictionScore: conditions.frictionRating,
        });

        // Find or create crag in database to enable reports (if not already found via local search)
        if (!cragId) {
          try {
            const crag = await findOrCreateCrag({
              name: location,
              lat,
              lon,
              country,
              state,
              municipality,
              village,
              rockType: detectedRockType,
              source: "ai_chat",
            });
            cragId = crag.id;
            cragSlug = crag.slug || undefined;
            console.log("[get_conditions] Crag found/created:", {
              cragId,
              cragSlug,
              name: crag.name,
            });
          } catch (error) {
            console.error("[get_conditions] Failed to find/create crag:", error);
            // Continue without cragId - reports won't work but conditions will
          }
        } else {
          console.log(
            "[get_conditions] Using cragId from local search:",
            cragId,
            "slug:",
            cragSlug
          );
        }

        // Fetch recent community reports for this crag
        let recentReports: any[] = [];
        if (cragId) {
          try {
            recentReports = await fetchReportsByCrag(cragId, 10);
            console.log("[get_conditions] Fetched recent reports:", {
              cragId,
              reportCount: recentReports.length,
              reports: recentReports.map((r) => ({
                category: r.category,
                text: r.text?.substring(0, 50) + "...",
                observedAt: r.observed_at,
                author: r.author?.display_name || "Anonymous",
                authorObject: r.author, // Raw author object for debugging
                authorId: r.author_id,
              })),
            });
          } catch (error) {
            console.error("[get_conditions] Failed to fetch reports:", error);
            // Continue without reports - not critical for conditions
          }
        } else {
          console.log("[get_conditions] No cragId available, skipping reports fetch");
        }

        const result = {
          location,
          locationDetails, // Add region/country or OpenBeta path
          latitude: lat,
          longitude: lon,
          cragId, // Include crag ID for reports
          cragSlug, // Include slug for URL generation
          country,
          state,
          municipality,
          village,
          rockType: detectedRockType, // Include rock type for AI context
          description, // Crag description for AI context
          aspects, // Wall orientation (N, S, E, W, etc.)
          climbingTypes, // Types of climbing available
          timeframe: timeframe || "now", // Add timeframe to response
          rating: conditions.rating,
          frictionScore: conditions.frictionRating,
          reasons: conditions.reasons,
          warnings: conditions.warnings || [],
          isDry: conditions.isDry,
          dryingTimeHours: conditions.dryingTimeHours,
          optimalWindows: conditions.optimalWindows,
          // Return 48h to AI for reasonable token usage (~2 days context)
          // UI can fetch full 14-day data via /api/conditions when detail view opens
          hourlyConditions: conditions.hourlyConditions?.slice(0, 48),
          precipitationContext: conditions.precipitationContext,
          dewPointSpread: conditions.dewPointSpread,
          optimalTime: conditions.optimalTime,
          timeContext: conditions.timeContext,
          current: {
            temperature_c: forecast.current.temperature,
            humidity: forecast.current.humidity,
            windSpeed_kph: forecast.current.windSpeed,
            precipitation_mm: forecast.current.precipitation,
            weatherCode: forecast.current.weatherCode,
          },
          // Include today's sunrise/sunset from forecast as fallback
          astro: forecast.daily?.[0]
            ? {
                sunrise: forecast.daily[0].sunrise,
                sunset: forecast.daily[0].sunset,
              }
            : undefined,
          // Include full daily forecast
          dailyForecast: forecast.daily?.map((day) => ({
            date: day.date,
            tempMax: day.tempMax,
            tempMin: day.tempMin,
            precipitation: day.precipitation,
            windSpeedMax: day.windSpeedMax,
            sunrise: day.sunrise,
            sunset: day.sunset,
            weatherCode: day.weatherCode,
          })),
          // Include recent community reports for AI context
          recentReports: recentReports.map((report) => ({
            category: report.category,
            text: report.text,
            observedAt: report.observed_at,
            ratingDry: report.rating_dry,
            ratingWind: report.rating_wind,
            ratingCrowds: report.rating_crowds,
            author: report.author?.display_name || "Anonymous",
            confirmationCount: report.confirmationCount || 0,
          })),
        };

        // Log final data being returned to AI (for debugging report integration)
        console.log("[get_conditions] Returning to AI:", {
          location,
          cragId,
          reportCount: recentReports.length,
          hasReports: recentReports.length > 0,
          reportPreview:
            recentReports.length > 0
              ? {
                  firstReport: {
                    category: recentReports[0].category,
                    text: recentReports[0].text?.substring(0, 80) + "...",
                    author: recentReports[0].author?.display_name || "Anonymous",
                    observedAt: recentReports[0].observed_at,
                  },
                }
              : "No reports",
        });

        return result;
      } catch (error) {
        console.error("[get_conditions] Error:", {
          location,
          lat,
          lon,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        return {
          error: `Failed to fetch conditions for ${location}`,
          location,
        };
      }
    },
  }),
  add_report: tool({
    description: "Add a community report about climbing conditions",
    inputSchema: z.object({
      location: z.string().describe("Crag/sector/route name"),
      dryness: z.number().min(1).max(5).optional().describe("Dryness rating 1-5"),
      wind: z.number().min(1).max(5).optional().describe("Wind rating 1-5"),
      crowds: z.number().min(1).max(5).optional().describe("Crowds rating 1-5"),
      text: z.string().optional().describe("Optional comment"),
    }),
    execute: async ({ location }) => {
      // TODO: Implement report creation in Supabase with dryness, wind, crowds, text
      return {
        success: true,
        location,
        message: `Report submitted for ${location}`,
      };
    },
  }),
  confirm_report: tool({
    description: "Confirm/thumbs up an existing report",
    inputSchema: z.object({
      report_id: z.string().describe("ID of the report to confirm"),
    }),
    execute: async ({ report_id }) => {
      // TODO: Implement confirmation in Supabase
      return {
        success: true,
        reportId: report_id,
        message: `Report confirmed`,
      };
    },
  }),
};

export async function POST(req: Request) {
  const {
    messages,
    language,
    userDateTime,
    userTimezone,
    units,
  }: {
    messages: UIMessage[];
    language?: string;
    userDateTime?: string;
    userTimezone?: string;
    units?: UnitsConfig;
  } = await req.json();
  const locale = resolveLocale(language);

  // Format user's current time for the AI
  const userTime = userDateTime
    ? new Date(userDateTime).toLocaleString("en-US", {
        timeZone: userTimezone || "UTC",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : "Unknown time";

  // Build units context string if units are provided
  const unitsContext = units
    ? `

UNITS PREFERENCES:
The user prefers the following measurement units:
- Temperature: ${units.temperature === "celsius" ? "Celsius (°C)" : "Fahrenheit (°F)"}
- Wind Speed: ${getWindSpeedSymbol(units.windSpeed)}
- Precipitation: ${units.precipitation === "mm" ? "millimeters (mm)" : "inches (in)"}
- Distance: ${units.distance === "km" ? "kilometers (km)" : "miles (mi)"}
- Elevation: ${units.elevation === "meters" ? "meters (m)" : "feet (ft)"}

IMPORTANT: Always provide weather measurements in these preferred units when discussing conditions. Convert all values to match the user's preferences.`
    : "";

  const systemPrompt = `${getSystemPrompt(locale)}

CRITICAL TIME CONTEXT:
Current user time: ${userTime}
User timezone: ${userTimezone || "UTC"}
When the user says "now" or "today", they mean relative to this time.
When the user says "tomorrow", they mean the day after ${userTime}.${unitsContext}`;

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    tools: tools,
    // Encourage: assistant -> tool -> assistant(summary using tool result)
    // Steps ~= roundtrips + 1. Allow headroom to ensure a post-tool text step.
    stopWhen: stepCountIs(3),
    // Add smooth streaming for better UX - streams each word individually
    experimental_transform: smoothStream(),
  });

  // Track token usage across the stream
  let tokenUsage: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    reasoningTokens?: number;
    cachedInputTokens?: number;
  } | null = null;

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    // Capture token usage from finish parts
    messageMetadata: ({ part }) => {
      if (part.type === "finish" && part.totalUsage) {
        tokenUsage = {
          inputTokens: part.totalUsage.inputTokens,
          outputTokens: part.totalUsage.outputTokens,
          totalTokens: part.totalUsage.totalTokens,
          reasoningTokens: part.totalUsage.reasoningTokens,
          cachedInputTokens: part.totalUsage.cachedInputTokens,
        };
        return { totalUsage: part.totalUsage };
      }
    },
    onFinish: async ({ responseMessage }) => {
      console.log("[ChatLogger] onFinish callback triggered");

      // Extract user message from the last original message
      const lastMessage = messages[messages.length - 1];
      const userMessage =
        typeof lastMessage === "string"
          ? lastMessage
          : typeof lastMessage === "object" && "content" in lastMessage
            ? String(lastMessage.content)
            : JSON.stringify(lastMessage);

      // Extract AI response text and tool data from responseMessage
      // responseMessage has a 'parts' array with different part types
      const responseData = responseMessage as unknown as {
        parts?: Array<{
          type: string;
          text?: string;
          toolCallId?: string;
          input?: unknown;
          output?: unknown;
        }>;
      };

      // Extract tool calls, results, and AI text from parts
      const toolCalls: Array<{ name: string; arguments: unknown }> = [];
      const toolResults: Array<{ toolName: string; result: unknown }> = [];
      const textParts: string[] = [];

      if (Array.isArray(responseData.parts)) {
        for (const part of responseData.parts) {
          if (typeof part === "object" && part !== null) {
            // Extract tool calls (type starts with "tool-")
            if (part.type?.startsWith("tool-") && part.type !== "tool-result") {
              const toolName = part.type.replace("tool-", "");
              toolCalls.push({
                name: toolName,
                arguments: part.input,
              });

              // If the tool part has output, it's also a tool result
              if (part.output !== undefined) {
                toolResults.push({
                  toolName: toolName,
                  result: part.output,
                });
              }
            }
            // Extract text responses
            else if (part.type === "text" && part.text) {
              textParts.push(part.text);
            }
          }
        }
      }

      // Combine all text parts into AI response
      const aiResponse = textParts.length > 0 ? textParts.join("\n") : "";

      // Extract metadata from tool results (location, country, etc.)
      const metadata = extractMetadataFromToolResults(toolResults);

      // Calculate cost if we have token usage
      const estimatedCostUsd = tokenUsage ? calculateGeminiCost(tokenUsage) : undefined;

      // Log the interaction (non-blocking)
      await logChatInteraction({
        sessionId: req.headers.get("x-session-id") || `anonymous-${Date.now()}`,
        userMessage,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        toolResults:
          toolResults.length > 0
            ? toolResults.map((r) => ({ name: r.toolName, result: r.result }))
            : undefined,
        aiResponse,
        locale,
        userAgent: req.headers.get("user-agent") || undefined,
        ...metadata,
        // Token usage and cost
        inputTokens: tokenUsage?.inputTokens,
        outputTokens: tokenUsage?.outputTokens,
        totalTokens: tokenUsage?.totalTokens,
        reasoningTokens: tokenUsage?.reasoningTokens,
        cachedInputTokens: tokenUsage?.cachedInputTokens,
        estimatedCostUsd,
      }).catch((err) => {
        // Logging errors should not break the response
        console.error("[POST /api/chat] Failed to log interaction:", err);
      });

      console.log("[ChatLogger] Logging complete");
    },
  });
}
