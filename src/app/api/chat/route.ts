import { streamText, tool, stepCountIs, convertToModelMessages, UIMessage, smoothStream } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { searchLocationMultiple } from "@/lib/external-apis/geocoding";
import { getWeatherForecast } from "@/lib/external-apis/open-meteo";
import { computeConditions, RockType } from "@/lib/conditions/conditions.service";

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

      // If no coordinates provided, search for location using geocoding
      if (!lat || !lon) {
        try {
          console.log(
            "[get_conditions] No coordinates provided, searching for location:",
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
              message: `Found multiple locations for "${location}". Please choose one:`,
              options: geocodedMultiple.map((result) => ({
                id: `${result.latitude},${result.longitude}`,
                name: result.name,
                location: `${result.admin2 || result.admin1 || ""}, ${result.country}`.trim(),
                latitude: result.latitude,
                longitude: result.longitude,
              })),
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

      try {
        console.log("[get_conditions] Fetching weather forecast:", {
          location,
          lat,
          lon,
          rockType,
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
          (rockType as RockType) || "unknown",
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
    description: "Search for a crag by name or location",
    inputSchema: z.object({
      query: z.string().describe("Crag name or location"),
    }),
    execute: async ({ query }) => {
      // TODO: Implement crag search from Supabase/OpenBeta
      return {
        query,
        results: [],
        message: `Search for "${query}" pending implementation`,
      };
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
