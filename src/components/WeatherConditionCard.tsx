import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { getWeatherEmoji, getWeatherDescription } from "@/lib/utils/weather-emojis";
import { logRender } from "@/lib/debug/render-log";

interface ConditionsData {
  location: string;
  locationDetails?: string;
  timeframe?: string;
  rating: string;
  frictionScore: number;
  reasons?: string[];
  warnings?: string[];
  isDry: boolean;
  current?: {
    temperature_c: number;
    humidity: number;
    windSpeed_kph: number;
    precipitation_mm: number;
    weatherCode: number;
  };
  hourlyConditions?: unknown[];
  optimalWindows?: unknown[];
}

interface WeatherConditionCardProps {
  data: ConditionsData;
  translateWeather: (description: string) => string;
  translateRating: (rating: string) => string;
  translateWarning: (warning: string) => string;
  translateReason: (reason: string) => string;
  onDetailsClick: () => void;
  conditionsLabel: string;
  detailsLabel: string;
}

function isNightTime(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 19 || hour < 7;
}

export const WeatherConditionCard = memo(function WeatherConditionCard({
  data,
  translateWeather,
  translateRating,
  translateWarning,
  translateReason,
  onDetailsClick,
  conditionsLabel,
  detailsLabel,
}: WeatherConditionCardProps) {
  const hasEmoji = data.current?.weatherCode !== undefined;
  logRender("WeatherConditionCard", {
    location: data.location,
    hasEmoji,
    warnings: data.warnings?.length ?? 0,
    reasons: data.reasons?.length ?? 0,
  });

  return (
    <div className="bg-muted/50 rounded-lg p-3 sm:p-4 border border-border w-full max-w-2xl transition-all duration-500 ease-out will-change-[max-width,transform]">
      <div
        className={
          `grid items-start gap-x-2 gap-y-1.5 sm:gap-x-3 sm:gap-y-2 transition-all duration-500 ease-out ` +
          (hasEmoji
            ? "grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto]"
            : "grid-cols-[1fr] sm:grid-cols-[1fr_auto]")
        }
      >
        {/* Weather emoji */}
        {hasEmoji && (
          <div className="row-start-1 col-start-1 shrink-0 w-10 sm:w-12 text-center">
            <div
              className="text-3xl sm:text-4xl leading-none"
              title={translateWeather(getWeatherDescription(data.current!.weatherCode))}
            >
              {getWeatherEmoji(data.current!.weatherCode, isNightTime(new Date()))}
            </div>
            {typeof data.current?.temperature_c === "number" && (
              <div className="mt-1 text-[10px] sm:text-xs leading-tight text-muted-foreground">
                {Math.round(data.current.temperature_c)}°C
              </div>
            )}
          </div>
        )}

        {/* Main content */}
        <div
          className={`${hasEmoji ? "col-start-2" : "col-start-1"} min-w-0 space-y-1 sm:space-y-1.5`}
        >
          <div className="space-y-0.5">
            <div className="font-semibold text-base">
              🧗 {data.location}
            </div>
            {data.locationDetails && (
              <div className="text-xs text-muted-foreground">📍 {data.locationDetails}</div>
            )}
            {hasEmoji && (
              <div className="text-xs text-muted-foreground">
                {translateWeather(getWeatherDescription(data.current!.weatherCode))}
              </div>
            )}
          </div>
          <div className="font-medium">
            {conditionsLabel}: {translateRating(data.rating)} ({data.frictionScore}/5)
          </div>
        </div>

        {/* Details button */}
        {(data.hourlyConditions || data.optimalWindows) && (
          <Button
            variant="outline"
            size="sm"
            className={
              `${hasEmoji ? "col-start-2" : "col-start-1"} row-start-2 ` +
              `${hasEmoji ? "sm:col-start-3" : "sm:col-start-2"} sm:row-start-1 ` +
              "shrink-0 justify-self-start sm:justify-self-end"
            }
            onClick={onDetailsClick}
          >
            <Info className="w-4 h-4 mr-1" />
            {detailsLabel}
          </Button>
        )}

        {/* Warnings */}
        {data.warnings && data.warnings.length > 0 && (
          <div
            className={
              `text-destructive font-semibold text-sm ${hasEmoji ? "col-start-2" : "col-start-1"} ` +
              `${hasEmoji ? "sm:col-start-2" : "sm:col-start-1"} ` +
              `animate-in fade-in-0 slide-in-from-bottom-2 duration-500`
            }
          >
            ⚠️ {data.warnings.map(translateWarning).join(", ")}
          </div>
        )}

        {/* Reasons */}
        {data.reasons && data.reasons.length > 0 && (
          <div
            className={
              `text-sm opacity-80 ${hasEmoji ? "col-start-2" : "col-start-1"} ` +
              `${hasEmoji ? "sm:col-start-2" : "sm:col-start-1"} ` +
              `animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-100`
            }
          >
            {data.reasons.map(translateReason).join(", ")}
          </div>
        )}
      </div>
    </div>
  );
});
