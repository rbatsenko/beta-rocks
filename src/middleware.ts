import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for beta.rocks
 * - Detects user's country via Vercel geo headers for i18n
 * - Handles CORS preflight for mobile app API access
 */
export function middleware(request: NextRequest) {
  // Handle CORS preflight for API routes
  if (
    request.method === "OPTIONS" &&
    request.nextUrl.pathname.startsWith("/api/")
  ) {
    const origin = request.headers.get("origin");
    const response = new NextResponse(null, { status: 204 });

    // Allow all origins in dev, specific ones in production
    if (process.env.NODE_ENV === "development" || !origin) {
      response.headers.set("Access-Control-Allow-Origin", origin || "*");
    } else {
      const allowedOrigins = [
        "https://beta.rocks",
        "https://www.beta.rocks",
      ];
      if (allowedOrigins.includes(origin)) {
        response.headers.set("Access-Control-Allow-Origin", origin);
      }
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

  const response = NextResponse.next();

  // Add CORS headers to API responses for mobile app access
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    if (origin) {
      if (process.env.NODE_ENV === "development") {
        response.headers.set("Access-Control-Allow-Origin", origin);
      } else {
        const allowedOrigins = [
          "https://beta.rocks",
          "https://www.beta.rocks",
        ];
        if (allowedOrigins.includes(origin)) {
          response.headers.set("Access-Control-Allow-Origin", origin);
        }
      }
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Sync-Key-Hash, X-Client-Platform"
      );
    }
  }

  // Detect country via Vercel geo headers for i18n
  const country = request.headers.get("x-vercel-ip-country");
  if (country) {
    response.cookies.set("user-country", country, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  return response;
}

export const config = {
  matcher: [
    // Match API routes for CORS
    "/api/:path*",
    // Match pages for geo detection (exclude static files)
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
