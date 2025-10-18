import { streamText, tool, stepCountIs, convertToModelMessages, UIMessage, smoothStream } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { searchLocationMultiple } from "@/lib/external-apis/geocoding";
import { getWeatherForecast } from "@/lib/external-apis/open-meteo";
import { computeConditions, RockType } from "@/lib/conditions/conditions.service";
import { searchAreas, formatAreaPath, extractRockType, isCrag, hasPreciseCoordinates } from "@/lib/openbeta/client";

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
              console.log(
                "[get_conditions] Multiple crags found, returning disambiguation"
              );

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
        const hourlyData = forecast.hourly.map((h) => ({
          time: h.time,
          temp_c: h.temperature,
          humidity: h.humidity,
          wind_kph: h.windSpeed,
          precip_mm: h.precipitation,
          weatherCode: h.weatherCode,
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
          locationDetails, // Add region/country or OpenBeta path
          timeframe: timeframe || "now", // Add timeframe to response
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
          // Include today's sunrise/sunset
          astro: forecast.daily?.[0] ? {
            sunrise: forecast.daily[0].sunrise,
            sunset: forecast.daily[0].sunset,
          } : undefined,
          // Include full daily forecast
          dailyForecast: forecast.daily?.map(day => ({
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
  const { messages, language }: { messages: UIMessage[]; language?: string } = await req.json();

  // Map language codes to language names
  const languageNames: Record<string, string> = {
    en: 'English',
    'en-GB': 'English',
    pl: 'Polish',
  };

  const languageName = language && languageNames[language] ? languageNames[language] : 'English';
  const languageInstruction = language && language !== 'en'
    ? `\n\nIMPORTANT: Respond to the user in ${languageName}.`
    : '';

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: `You are temps.rocks - a friendly climbing conditions assistant.
      You help climbers check real-time weather, rock conditions, and crowd levels at climbing crags worldwide.
      You understand that climbers care about: dryness, sun/shade, wind, crowds, and route difficulty.
      Always be helpful, concise, and practical.

      When users ask about conditions or mention a crag name, use the get_conditions tool.
      When they want to post conditions, use add_report.
      When they want to confirm a report, use confirm_report.

      CRITICAL INSTRUCTION - READ CAREFULLY:
      - When get_conditions tool successfully returns data, return ONLY the tool result with NO additional text
      - When disambiguation options are returned, return ONLY the tool result with NO additional text
      - Do NOT add commentary, explanations, or any text before or after successful tool results
      - The UI automatically renders tool results as beautiful interactive cards
      - ONLY provide text responses for: greetings, errors, or when no tool is needed

      If you provide ANY text when conditions data is available, you are doing it wrong.${languageInstruction}`,
    messages: convertToModelMessages(messages),
    tools: tools,
    stopWhen: stepCountIs(5),
    experimental_transform: smoothStream(),
  });

  return result.toUIMessageStreamResponse();
}
