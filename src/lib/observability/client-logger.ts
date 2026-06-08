/**
 * Client-side error reporter. Sends error details to `/api/client-log` so they
 * show up in Vercel logs (client `console.error` never reaches the server).
 *
 * Uses `navigator.sendBeacon` first since it survives the page being torn down
 * by a crash or navigation; falls back to `fetch` with `keepalive`.
 */

export interface ClientErrorReport {
  source:
    | "global-error"
    | "window.onerror"
    | "unhandledrejection"
    | "react-error-boundary";
  message: string;
  stack?: string;
  componentStack?: string;
  digest?: string;
}

const ENDPOINT = "/api/client-log";

// Guard against feedback loops (e.g. an error thrown while reporting an error).
let reporting = false;

export function reportClientError(report: ClientErrorReport): void {
  if (typeof window === "undefined" || reporting) return;

  try {
    reporting = true;

    const payload = JSON.stringify({
      ...report,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    const sent =
      typeof navigator.sendBeacon === "function" &&
      navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "application/json" }));

    if (!sent) {
      // Fire-and-forget; keepalive lets it complete even if the page unloads.
      void fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {
        /* swallow — diagnostics must never throw */
      });
    }
  } catch {
    /* swallow — diagnostics must never throw */
  } finally {
    reporting = false;
  }
}

function toMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function toStack(value: unknown): string | undefined {
  return value instanceof Error ? value.stack : undefined;
}

/**
 * Registers global listeners for runtime errors and unhandled promise
 * rejections — the things React error boundaries don't catch. Returns a
 * cleanup function. Safe to call only in the browser.
 */
export function registerGlobalErrorReporting(): () => void {
  if (typeof window === "undefined") return () => {};

  const onError = (event: ErrorEvent) => {
    reportClientError({
      source: "window.onerror",
      message: event.message || toMessage(event.error),
      stack: toStack(event.error),
    });
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    reportClientError({
      source: "unhandledrejection",
      message: toMessage(event.reason),
      stack: toStack(event.reason),
    });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
