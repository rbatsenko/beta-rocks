import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/chat
 * Handles chat messages and returns AI responses
 *
 * Expected request body:
 * {
 *   message: string;
 *   lang?: string;
 *   location?: { lat: number; lon: number };
 * }
 *
 * TODO: Implement Gemini 2.5 Flash integration via Vercel AI SDK
 */
export async function POST(request: NextRequest) {
  try {
    const { message, lang = "en", location } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Invalid message" },
        { status: 400 }
      );
    }

    // TODO: Call Gemini 2.5 Flash API to process the message
    // TODO: Implement intent classification (get_conditions, add_report, etc.)
    // TODO: Call external APIs based on intent

    // Temporary mock response
    const reply =
      "Thanks for asking! I'm still learning about climbing conditions. Check back soon for real-time weather data, community reports, and route-specific conditions.";

    return NextResponse.json({
      reply,
      chips: [],
      state: { location },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
