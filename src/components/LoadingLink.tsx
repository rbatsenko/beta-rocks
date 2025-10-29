"use client";

import Link, { LinkProps } from "next/link";
import { useLoadingState } from "./NavigationProgress";
import { ComponentPropsWithoutRef, forwardRef } from "react";

/**
 * A Link component that automatically triggers the global loading state.
 * Use this instead of next/link when you want the top loading bar to show.
 *
 * Example:
 * ```tsx
 * <LoadingLink href="/location/el-cap">El Capitan</LoadingLink>
 * ```
 */
export const LoadingLink = forwardRef<
  HTMLAnchorElement,
  Omit<ComponentPropsWithoutRef<"a">, keyof LinkProps> & LinkProps
>(({ onClick, ...props }, ref) => {
  const { startLoading } = useLoadingState();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    startLoading();
    onClick?.(e);
  };

  return <Link ref={ref} {...props} onClick={handleClick} />;
});

LoadingLink.displayName = "LoadingLink";
