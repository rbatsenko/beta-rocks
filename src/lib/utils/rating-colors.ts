/**
 * Color utilities for report rating values (1-5 scale).
 */

// ── Crowds: 1=empty (green), 5=very crowded (red) ──

export function getCrowdColorClass(rating: number): string {
  if (rating >= 4) return "text-red-500";
  if (rating <= 2) return "text-green-500";
  return "text-orange-500";
}

export function getCrowdBorderClass(rating: number): string {
  if (rating >= 4) return "border-red-300 dark:border-red-800";
  return "";
}

export function getCrowdIconClass(rating: number): string {
  if (rating >= 4) return "text-red-500";
  return "";
}

export function getCrowdTextClass(rating: number): string {
  if (rating >= 4) return "text-red-500";
  if (rating <= 2) return "text-green-600 dark:text-green-400";
  return "";
}

// ── Dryness: 1=very wet (red), 5=very dry (green) ──

export function getDrynessColorClass(rating: number): string {
  if (rating >= 4) return "text-green-500";
  if (rating <= 2) return "text-red-500";
  return "text-orange-500";
}

export function getDrynessBorderClass(rating: number): string {
  if (rating <= 2) return "border-red-300 dark:border-red-800";
  return "";
}

export function getDrynessIconClass(rating: number): string {
  if (rating <= 2) return "text-red-500";
  if (rating >= 4) return "text-green-500";
  return "";
}

export function getDrynessTextClass(rating: number): string {
  if (rating <= 2) return "text-red-500";
  if (rating >= 4) return "text-green-600 dark:text-green-400";
  return "";
}
