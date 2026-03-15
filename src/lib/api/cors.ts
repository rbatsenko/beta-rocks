/**
 * CORS utilities for API routes
 * Enables mobile apps (React Native/Expo) to call the Next.js API
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGINS = [
  // Local development
  "http://localhost:8081", // Expo dev server
  "http://localhost:19006", // Expo web
  "http://localhost:3000", // Next.js dev
  // Production - add your production URLs here
  "https://beta.rocks",
  "https://www.beta.rocks",
];

/**
 * Check if an origin is allowed
 * In development, allows all origins for easier testing
 */
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // Same-origin requests
  if (process.env.NODE_ENV === "development") return true;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Add CORS headers to a response
 */
export function withCorsHeaders(
  response: NextResponse,
  request?: NextRequest
): NextResponse {
  const origin = request?.headers.get("origin");

  if (isAllowedOrigin(origin)) {
    response.headers.set(
      "Access-Control-Allow-Origin",
      origin || "*"
    );
  }

  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Sync-Key-Hash, X-Client-Platform"
  );
  response.headers.set("Access-Control-Max-Age", "86400");

  return response;
}

/**
 * Handle CORS preflight (OPTIONS) requests
 */
export function handleCorsPreflightResponse(request: NextRequest): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return withCorsHeaders(response, request);
}
