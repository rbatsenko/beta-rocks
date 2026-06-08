"use client";

import { useEffect } from "react";
import { registerGlobalErrorReporting } from "@/lib/observability/client-logger";

/**
 * Mounts global runtime-error / unhandled-rejection listeners that forward to
 * `/api/client-log`. Renders nothing. Catches errors outside React's render
 * path (event handlers, async code, third-party scripts) that error boundaries
 * miss — the likely source of the mobile full-screen crash.
 */
export function ClientErrorReporter() {
  useEffect(() => registerGlobalErrorReporting(), []);
  return null;
}
