"use client";

import { useLinkStatus } from "next/link";

/**
 * A loading indicator that shows when a link navigation is pending.
 * Must be used as a child of a next/link component.
 *
 * Example:
 * ```tsx
 * <Link href="/location/el-cap">
 *   El Capitan
 *   <LinkLoadingIndicator />
 * </Link>
 * ```
 */
export function LinkLoadingIndicator() {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden
      className={`inline-block w-2 h-2 ml-2 rounded-full bg-current transition-opacity duration-200 ${
        pending ? "opacity-40 animate-pulse" : "opacity-0 invisible"
      }`}
    />
  );
}
