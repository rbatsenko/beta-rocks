import { NextResponse } from "next/server";

/**
 * Receives client-side error reports and writes them to the server log so they
 * surface in Vercel function logs (client `console.error` is otherwise invisible
 * to us). Grep for `[CLIENT-ERROR]` in the Vercel dashboard.
 *
 * Intentionally permissive: this is a diagnostics endpoint, so we never throw
 * and never block — a bad payload just gets logged as-is.
 */
export const runtime = "nodejs";

interface ClientLogPayload {
  source?: string; // "global-error" | "window.onerror" | "unhandledrejection" | "react-error-boundary"
  message?: string;
  stack?: string;
  componentStack?: string;
  digest?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ClientLogPayload;

    // Prefer the UA from the request header (more reliable than the client-sent one).
    const userAgent = request.headers.get("user-agent") ?? body.userAgent ?? "unknown";

    const entry = {
      source: body.source ?? "unknown",
      message: body.message ?? "(no message)",
      url: body.url ?? "unknown",
      userAgent,
      digest: body.digest,
      timestamp: body.timestamp ?? new Date().toISOString(),
      stack: body.stack,
      componentStack: body.componentStack,
    };

    // Single greppable line + the stack on following lines for readability.
    console.error(`[CLIENT-ERROR] ${JSON.stringify(entry)}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[CLIENT-ERROR] failed to parse client log payload", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
