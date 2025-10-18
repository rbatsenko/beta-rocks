import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { getWeatherEmoji, getWeatherDescription } from '@/lib/utils/weather-emojis';

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
  translateTimeframe: (timeframe: string) => string;
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
  translateTimeframe,
  onDetailsClick,
  conditionsLabel,
  detailsLabel,
}: WeatherConditionCardProps) {
  return (
    <div className="mt-3 bg-muted/50 rounded-lg p-3 sm:p-4 border border-border max-w-full overflow-hidden space-y-2">
      {/* Top row: emoji, basic info, and button */}
      <div className="flex items-start gap-2 sm:gap-3 min-w-0">
        {/* Weather emoji display */}
        {data.current?.weatherCode !== undefined && (
          <div className="shrink-0">
            <div
              className="text-3xl sm:text-4xl"
              title={translateWeather(getWeatherDescription(data.current.weatherCode))}
            >
              {getWeatherEmoji(data.current.weatherCode, isNightTime(new Date()))}
            </div>
          </div>
        )}

        <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
          <div className="space-y-0.5">
            <div className="font-semibold text-base">
              🧗 {data.location}
              {data.timeframe && data.timeframe !== "now" && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({translateTimeframe(data.timeframe)})
                </span>
              )}
            </div>
            {data.locationDetails && (
              <div className="text-xs text-muted-foreground">
                📍 {data.locationDetails}
              </div>
            )}
            {data.current?.weatherCode !== undefined && (
              <div className="text-xs text-muted-foreground">
                {translateWeather(getWeatherDescription(data.current.weatherCode))}
              </div>
            )}
          </div>
          <div className="font-medium">
            {conditionsLabel}: {translateRating(data.rating)} ({data.frictionScore}/5)
          </div>
        </div>
        {(data.hourlyConditions || data.optimalWindows) && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 self-start"
            onClick={onDetailsClick}
          >
            <Info className="w-4 h-4 mr-1" />
            {detailsLabel}
          </Button>
        )}
      </div>

      {/* Warnings - full width */}
      {data.warnings && data.warnings.length > 0 && (
        <div className="text-destructive font-semibold text-sm">
          ⚠️ {data.warnings.map(translateWarning).join(", ")}
        </div>
      )}

      {/* Reasons - full width */}
      {data.reasons && data.reasons.length > 0 && (
        <div className="text-sm opacity-80">
          {data.reasons.map(translateReason).join(", ")}
        </div>
      )}
    </div>
  );
});
