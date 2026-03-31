import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGINS = [
  "https://beta.rocks",
  "https://www.beta.rocks",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  if (process.env.NODE_ENV === "development") return true;
  return ALLOWED_ORIGINS.includes(origin);
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");
  const isPublicApi = pathname.startsWith("/api/v1/");

  // Handle CORS preflight for public API v1 routes (open to all origins)
  if (request.method === "OPTIONS" && isPublicApi) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Handle CORS preflight for other API routes (mobile app access)
  if (request.method === "OPTIONS" && isApiRoute) {
    const response = new NextResponse(null, { status: 204 });
    if (isAllowedOrigin(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin || "*");
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
    response.headers.set("Vary", "Origin");
    return response;
  }

  const response = NextResponse.next();

  // Add open CORS headers to public API v1 responses
  if (isPublicApi) {
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  } else if (isApiRoute && origin && isAllowedOrigin(origin)) {
    // Add CORS headers to other API responses for mobile app access
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Sync-Key-Hash, X-Client-Platform"
    );
    response.headers.set("Vary", "Origin");
  }

  // Get the user's country from Vercel's geo-IP header
  const country = request.headers.get("x-vercel-ip-country");

  // Set a cookie with the detected country for client-side access
  if (country && !request.cookies.get("detected-country")) {
    response.cookies.set("detected-country", country, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
