/**
 * Client-side instrumentation for tracking navigation events.
 * This tracks ALL navigation including router.push(), not just <Link> clicks.
 *
 * Next.js automatically loads this file when experimental.instrumentationHook is enabled.
 */

// Global event emitter for navigation state
class NavigationEmitter extends EventTarget {
  private _isNavigating = false;

  get isNavigating() {
    return this._isNavigating;
  }

  startNavigation() {
    if (this._isNavigating) return; // Already navigating
    this._isNavigating = true;
    this.dispatchEvent(new Event("navigationStart"));
  }

  endNavigation() {
    if (!this._isNavigating) return; // Not navigating
    this._isNavigating = false;
    this.dispatchEvent(new Event("navigationEnd"));
  }
}

/**
 * Get or create singleton navigation emitter instance.
 * Ensures the same instance is used across all imports.
 */
function getOrCreateEmitter(): NavigationEmitter {
  if (typeof window === "undefined") {
    // Server-side: create temporary instance (not used)
    return new NavigationEmitter();
  }

  // Client-side: use global singleton
  if (!(window as any).__navigationEmitter) {
    (window as any).__navigationEmitter = new NavigationEmitter();
  }
  return (window as any).__navigationEmitter;
}

/**
 * Next.js built-in hook called when navigation starts.
 * Automatically triggered for router.push(), router.replace(), and Link navigation.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
export function onRouterTransitionStart(
  url: string,
  navigationType: "push" | "replace" | "traverse"
) {
  console.log(`[Navigation] ${navigationType} to ${url}`);
  const emitter = getOrCreateEmitter();
  emitter.startNavigation();
}

/**
 * Helper to get the navigation emitter instance.
 * Used by NavigationProgress component.
 */
export function getNavigationEmitter(): NavigationEmitter {
  return getOrCreateEmitter();
}
