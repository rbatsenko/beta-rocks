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
import { searchCrags } from "@/lib/db/queries";
import { resolveLocale } from "@/lib/i18n/config";
import { getSystemPrompt } from "./prompts";
import {
  logChatInteraction,
  extractMetadataFromToolResults,
  calculateGeminiCost,
} from "@/lib/observability/chat-logger";
import { createClient } from "@supabase/supabase-js";

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
              // Perfect! Single crag found locally
              const crag = localCrags[0];
              lat = crag.lat;
              lon = crag.lon;
              detectedRockType = (detectedRockType || (crag.rock_type as RockType)) as RockType;

              // Capture detailed location data
              country = crag.country || undefined;
              state = crag.state || undefined;
              municipality = crag.municipality || undefined;
              village = crag.village || undefined;

              // Capture crag-specific metadata for AI context
              description = crag.description || undefined;
              aspects = crag.aspects || undefined;
              climbingTypes = crag.climbing_types || undefined;

              // Build locationDetails from available fields
              const locationParts = [];
              if (village) locationParts.push(village);
              if (municipality && municipality !== village) locationParts.push(municipality);
              if (state) locationParts.push(state);
              if (country) locationParts.push(country);
              locationDetails = locationParts.join(", ");

              console.log("[get_conditions] Using local database crag:", {
                name: crag.name,
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
              // Multiple crags found locally - return disambiguation
              console.log(
                "[get_conditions] Multiple crags found in local DB, returning disambiguation"
              );

              return {
                disambiguate: true,
                source: "local",
                message: `Found ${localCrags.length} climbing areas for "${location}" in our database. Please choose one:`,
                translationKey: "disambiguation.foundMultipleAreas",
                translationParams: { count: localCrags.length, location },
                options: localCrags.map((crag) => ({
                  id: crag.id,
                  name: crag.name,
                  location: crag.country,
                  latitude: crag.lat,
                  longitude: crag.lon,
                  rockType: crag.rock_type || "unknown",
                })),
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

        return {
          location,
          locationDetails, // Add region/country or OpenBeta path
          latitude: lat,
          longitude: lon,
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
          // Return full hourly conditions (UI needs this for details view)
          // TODO: Optimize by having UI fetch full data from /api/conditions to reduce AI tokens
          hourlyConditions: conditions.hourlyConditions,
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
};

export async function POST(req: Request) {
  const {
    messages,
    language,
    userDateTime,
    userTimezone,
  }: {
    messages: UIMessage[];
    language?: string;
    userDateTime?: string;
    userTimezone?: string;
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

  const systemPrompt = `${getSystemPrompt(locale)}

CRITICAL TIME CONTEXT:
Current user time: ${userTime}
User timezone: ${userTimezone || "UTC"}
When the user says "now" or "today", they mean relative to this time.
When the user says "tomorrow", they mean the day after ${userTime}.`;

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
      const estimatedCostUsd = tokenUsage
        ? calculateGeminiCost(tokenUsage)
        : undefined;

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
