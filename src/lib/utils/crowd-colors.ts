/**
 * Returns Tailwind color classes for a crowd rating value (1-5 scale).
 * 1-2 = green (empty/few people), 3 = orange (moderate), 4-5 = red (crowded/very crowded)
 */
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
