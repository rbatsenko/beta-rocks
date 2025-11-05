import { Badge } from "@/components/ui/badge";

interface LiveIndicatorProps {
  isLive: boolean;
  label?: string;
  compact?: boolean;
}

/**
 * LiveIndicator - Pulsing green dot to indicate realtime connectivity
 *
 * @param isLive - Whether the connection is active
 * @param label - Optional text label (e.g., "Live")
 * @param compact - If true, shows only the dot without badge wrapper
 */
export function LiveIndicator({ isLive, label, compact = false }: LiveIndicatorProps) {
  if (!isLive) return null;

  const pulsingDot = (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
    </span>
  );

  if (compact) {
    return pulsingDot;
  }

  return (
    <Badge
      variant="outline"
      className="gap-1.5 bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
    >
      {pulsingDot}
      {label && <span className="text-xs font-medium">{label}</span>}
    </Badge>
  );
}
