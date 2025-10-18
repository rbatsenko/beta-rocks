import { streamText, tool, stepCountIs, convertToModelMessages, UIMessage, smoothStream } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { searchLocationMultiple } from "@/lib/external-apis/geocoding";
import { getWeatherForecast } from "@/lib/external-apis/open-meteo";
import { computeConditions, RockType } from "@/lib/conditions/conditions.service";
import { searchAreas, formatAreaPath, getCountry, extractRockType, isCrag, hasPreciseCoordinates } from "@/lib/openbeta/client";

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
    execute: async ({ location, latitude, longitude, rockType }) => {
      console.log("[get_conditions] Starting tool execution:", {
        location,
        latitude,
        longitude,
        rockType,
      });

      let lat = latitude;
      let lon = longitude;
      let detectedRockType = rockType;

      // If no coordinates provided, search for location
      if (!lat || !lon) {
        // STEP 1: Try OpenBeta first (climbing-specific database)
        try {
          console.log(
            "[get_conditions] No coordinates provided, trying OpenBeta search:",
            location
          );

          const openBetaAreas = await searchAreas(location);
          console.log("[get_conditions] OpenBeta results:", {
            location,
            count: openBetaAreas.length,
          });

          if (openBetaAreas.length > 0) {
            // Filter to actual climbing crags (not countries/regions)
            // Also filter out areas with generic coordinates
            const crags = openBetaAreas.filter(area => {
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

              console.log("[get_conditions] Using OpenBeta crag:", {
                name: crag.area_name,
                path: formatAreaPath(crag),
                lat,
                lon,
                rockType: detectedRockType,
              });
            } else if (crags.length > 1) {
              // Multiple crags found - return disambiguation
              console.log(
                "[get_conditions] Multiple crags found, returning disambiguation"
              );
              return {
                disambiguate: true,
                source: "openbeta",
                message: `Found ${crags.length} climbing areas for "${location}". Please choose one:`,
                options: crags.map((crag) => ({
                  id: crag.uuid,
                  name: crag.area_name,
                  location: formatAreaPath(crag),
                  latitude: crag.metadata.lat,
                  longitude: crag.metadata.lng,
                  rockType: extractRockType(crag),
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

        // STEP 2: If OpenBeta didn't find a crag, fall back to geocoding
        if (!lat || !lon) {
          try {
            console.log(
              "[get_conditions] Falling back to geocoding API:",
              location
            );
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
                  };
                }),
              };
            }

            // Use the single result
            const geocoded = geocodedMultiple[0];
            lat = geocoded.latitude;
            lon = geocoded.longitude;
            console.log("[get_conditions] Using geocoded coordinates:", {
              lat,
              lon,
              name: geocoded.name,
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

      try {
        console.log("[get_conditions] Fetching weather forecast:", {
          location,
          lat,
          lon,
          rockType: detectedRockType,
        });

        // Call the weather API directly instead of making an HTTP request
        const forecast = await getWeatherForecast(lat, lon, 7);

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

        // Prepare hourly data
        const hourlyData = forecast.hourly.map((h) => ({
          time: h.time,
          temp_c: h.temperature,
          humidity: h.humidity,
          wind_kph: h.windSpeed,
          precip_mm: h.precipitation,
        }));

        // Compute conditions
        const conditions = computeConditions(
          {
            current: {
              temp_c: forecast.current.temperature,
              humidity: forecast.current.humidity,
              wind_kph: forecast.current.windSpeed,
              precip_mm: forecast.current.precipitation,
            },
            hourly: hourlyData,
          },
          (detectedRockType as RockType) || "unknown",
          0
        );

        console.log("[get_conditions] Successfully computed conditions:", {
          location,
          rating: conditions.rating,
          frictionScore: conditions.frictionRating,
        });

        return {
          location,
          rating: conditions.rating,
          frictionScore: conditions.frictionRating,
          reasons: conditions.reasons,
          warnings: conditions.warnings || [],
          isDry: conditions.isDry,
          dryingTimeHours: conditions.dryingTimeHours,
          optimalWindows: conditions.optimalWindows,
          hourlyConditions: conditions.hourlyConditions,
          precipitationContext: conditions.precipitationContext,
          dewPointSpread: conditions.dewPointSpread,
          optimalTime: conditions.optimalTime,
          current: {
            temperature_c: forecast.current.temperature,
            humidity: forecast.current.humidity,
            windSpeed_kph: forecast.current.windSpeed,
            precipitation_mm: forecast.current.precipitation,
            weatherCode: forecast.current.weatherCode,
          },
        };
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
  search_crag: tool({
    description: "Search for climbing crags, areas, sectors, or routes by name",
    inputSchema: z.object({
      query: z.string().describe("Crag/area/sector name to search for"),
    }),
    execute: async ({ query }) => {
      console.log("[search_crag] Starting search for:", query);

      try {
        // Search OpenBeta API
        const areas = await searchAreas(query);

        console.log("[search_crag] Found results:", {
          query,
          count: areas.length,
        });

        if (areas.length === 0) {
          return {
            query,
            results: [],
            message: `No climbing areas found for "${query}". Try a different search term.`,
          };
        }

        // Filter to only show likely crags (not countries/regions)
        const crags = areas.filter(isCrag);

        // Format results for the chat UI
        const results = crags.map((area) => ({
          id: area.uuid,
          name: area.area_name,
          path: formatAreaPath(area),
          country: getCountry(area),
          latitude: area.metadata.lat,
          longitude: area.metadata.lng,
          rockType: extractRockType(area),
          description: area.content?.description?.slice(0, 200), // First 200 chars
          childCount: area.children?.length || 0,
        }));

        console.log("[search_crag] Filtered to crags:", {
          originalCount: areas.length,
          cragCount: results.length,
        });

        return {
          query,
          results,
          message:
            results.length > 1
              ? `Found ${results.length} climbing areas for "${query}"`
              : `Found ${results[0].name} in ${results[0].country}`,
        };
      } catch (error) {
        console.error("[search_crag] Error:", {
          query,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });

        return {
          query,
          results: [],
          error: `Failed to search for "${query}". Please try again.`,
        };
      }
    },
  }),
};

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: `You are temps.rocks - a friendly climbing conditions assistant.
      You help climbers check real-time weather, rock conditions, and crowd levels at climbing crags worldwide.
      You understand that climbers care about: dryness, sun/shade, wind, crowds, and route difficulty.
      Always be helpful, concise, and practical.

      When users ask about conditions, use the get_conditions tool.
      When they want to post conditions, use add_report.
      When they want to confirm a report, use confirm_report.
      When they search for a crag, use search_crag.

      IMPORTANT: When a tool returns results (disambiguation options, condition data, etc.), DO NOT provide any text response.
      The UI will automatically render all tool results as interactive components.
      Only provide text responses when the tool returns an error or when greeting/chatting with the user.`,
    messages: convertToModelMessages(messages),
    tools: tools,
    stopWhen: stepCountIs(5),
    experimental_transform: smoothStream(),
  });

  return result.toUIMessageStreamResponse();
}
