import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

/**
 * POST /api/conditions/ai-assess
 *
 * Uses Claude Haiku to generate a nuanced friction label and short assessment
 * based on computed conditions data. Meant to enhance the algorithmic rating
 * with AI judgment for edge cases (e.g. humidity + rock type interactions,
 * drying conditions after rain, temperature inversions).
 *
 * Body: { conditions: ConditionsData, rockType: string, locale?: string }
 * Returns: { label: string, assessment: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { conditions, rockType, locale } = await request.json();

    if (!conditions) {
      return NextResponse.json(
        { error: "Missing conditions data" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Gracefully degrade - return the algorithmic rating as-is
      return NextResponse.json({
        label: conditions.rating,
        assessment: null,
        source: "algorithmic",
      });
    }

    const prompt = `You are a climbing conditions expert. Given the following weather and rock conditions data, provide:
1. A friction quality label (one of: Excellent, Great, Good, Fair, Poor, Bad)
2. A one-sentence assessment explaining why

Rock type: ${rockType || "unknown"}
Temperature: ${conditions.current?.temperature_c}°C
Humidity: ${conditions.current?.humidity}%
Wind: ${conditions.current?.windSpeed_kph} km/h
Precipitation (current): ${conditions.current?.precipitation_mm} mm
Algorithmic friction score: ${conditions.frictionScore}/5
Algorithmic rating: ${conditions.rating}
Is dry: ${conditions.isDry}
Drying time remaining: ${conditions.dryingTimeHours || 0}h
Dew point spread: ${conditions.dewPointSpread || "N/A"}°C
${conditions.precipitationContext ? `Last 24h precipitation: ${conditions.precipitationContext.last24h}mm` : ""}
${conditions.warnings?.length ? `Warnings: ${conditions.warnings.join(", ")}` : ""}

Respond in ${locale || "en"} with ONLY valid JSON: {"label": "...", "assessment": "..."}`;

    const result = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt,
      maxOutputTokens: 150,
    });

    const parsed = JSON.parse(result.text);

    return NextResponse.json({
      label: parsed.label,
      assessment: parsed.assessment,
      source: "ai",
    });
  } catch (error) {
    console.error("[AI Assess] Error:", error);
    // Graceful fallback
    return NextResponse.json({
      label: null,
      assessment: null,
      source: "error",
    });
  }
}
