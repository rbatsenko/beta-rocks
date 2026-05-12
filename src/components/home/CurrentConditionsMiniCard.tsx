"use client";

import { ThermometerSun, Droplets, Wind, CloudRain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { useUnits } from "@/hooks/useUnits";
import {
  convertTemperature,
  convertWindSpeed,
  formatTemperature,
  formatWindSpeed,
} from "@/lib/units/conversions";
import { getWeatherEmoji, getWeatherDescription } from "@/lib/utils/weather-emojis";
import { getLabelColor } from "@/components/conditions/ConditionsDetailDialog.utils";
import { cn } from "@/lib/utils";

export interface CurrentWeather {
  temperature_c: number;
  humidity: number;
  windSpeed_kph: number;
  windDirection?: number;
  precipitation_mm: number;
  weatherCode: number;
}

export interface ConditionsFlags {
  rain_now?: boolean;
  rain_expected?: { in_hours: number; mm: number } | null;
  condensation_risk?: boolean;
  high_humidity?: boolean;
  wet_rock_likely?: boolean;
  high_wind?: boolean;
  extreme_wind?: boolean;
  sandstone_wet_warning?: boolean;
}

interface CurrentConditionsMiniCardProps {
  label: string;
  summary?: string | null;
  summaryTemplate?: { key: string; params?: Record<string, unknown> } | null;
  current: CurrentWeather;
  flags?: ConditionsFlags | null;
}

const FLAG_PILL = "text-[11px] px-2 py-0.5 rounded-full";

export function CurrentConditionsMiniCard({
  label,
  summary,
  summaryTemplate,
  current,
  flags,
}: CurrentConditionsMiniCardProps) {
  const { t } = useClientTranslation("common");
  const { units } = useUnits();

  const labelText =
    label === "good"
      ? t("labels.good", "Good")
      : label === "fair"
        ? t("labels.fair", "Fair")
        : t("labels.poor", "Poor");

  const summaryText = summaryTemplate
    ? String(t(summaryTemplate.key, summaryTemplate.params) || summary || "")
    : summary || "";

  const temp = formatTemperature(
    convertTemperature(current.temperature_c, "celsius", units.temperature),
    units.temperature,
    0
  );
  const wind = formatWindSpeed(
    convertWindSpeed(current.windSpeed_kph, "kmh", units.windSpeed),
    units.windSpeed,
    0
  );

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-4xl leading-none" aria-hidden>
            {getWeatherEmoji(current.weatherCode)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">
              {getWeatherDescription(current.weatherCode)}
            </p>
            <p className="text-xs text-muted-foreground">{t("dialog.currentWeather", "Current weather")}</p>
          </div>
        </div>
        <Badge variant="outline" className={cn("text-sm px-2.5 py-1 shrink-0", getLabelColor(label))}>
          {labelText}
        </Badge>
      </div>

      {summaryText && <p className="text-sm text-muted-foreground mb-3 leading-snug">{summaryText}</p>}

      {flags && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {flags.rain_now && (
            <span className={cn(FLAG_PILL, "bg-blue-500/10 text-blue-600 dark:text-blue-400")}>
              🌧 {t("flags.rain", "Rain")}
            </span>
          )}
          {flags.rain_expected && (
            <span className={cn(FLAG_PILL, "bg-blue-500/10 text-blue-600 dark:text-blue-400")}>
              🌧 {t("flags.rainExpected", "Rain in {{hours}}h", { hours: flags.rain_expected.in_hours })}
            </span>
          )}
          {flags.condensation_risk && (
            <span className={cn(FLAG_PILL, "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400")}>
              💧 {t("flags.condensation", "Condensation")}
            </span>
          )}
          {flags.high_humidity && (
            <span className={cn(FLAG_PILL, "bg-slate-500/10 text-slate-600 dark:text-slate-400")}>
              💧 {t("flags.highHumidity", "High humidity")}
            </span>
          )}
          {flags.wet_rock_likely && (
            <span className={cn(FLAG_PILL, "bg-amber-500/10 text-amber-600 dark:text-amber-400")}>
              ⚠ {t("flags.wetRock", "Wet rock likely")}
            </span>
          )}
          {flags.high_wind && (
            <span className={cn(FLAG_PILL, "bg-orange-500/10 text-orange-600 dark:text-orange-400")}>
              💨 {t("flags.windy", "Windy")}
            </span>
          )}
          {flags.extreme_wind && (
            <span className={cn(FLAG_PILL, "bg-red-500/10 text-red-600 dark:text-red-400")}>
              💨 {t("flags.extremeWind", "Extreme wind")}
            </span>
          )}
          {flags.sandstone_wet_warning && (
            <span className={cn(FLAG_PILL, "bg-red-500/10 text-red-600 dark:text-red-400")}>
              ⚠ {t("flags.sandstoneWet", "Sandstone wet")}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Metric icon={<ThermometerSun className="h-3 w-3" />} label={t("dialog.temperature")} value={temp} />
        <Metric icon={<Droplets className="h-3 w-3" />} label={t("dialog.humidity")} value={`${Math.round(current.humidity)}%`} />
        <Metric icon={<Wind className="h-3 w-3" />} label={t("dialog.windSpeed")} value={wind} />
        <Metric icon={<CloudRain className="h-3 w-3" />} label={t("dialog.precipitation")} value={`${current.precipitation_mm.toFixed(1)} mm`} />
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="text-base font-semibold leading-tight">{value}</p>
    </div>
  );
}
