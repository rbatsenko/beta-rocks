import { useMemo } from "react";

/**
 * Hook for translating weather condition strings
 * Memoized to prevent recreation on every render
 */
export function useConditionsTranslations(
  t: (key: string, params?: Record<string, string | number>) => string
) {
  return useMemo(() => {
    const translateRating = (rating: string): string => {
      if (!rating) {
        return "";
      }
      const ratingLower = rating.toLowerCase();
      const key = `ratings.${ratingLower}`;
      return t(key);
    };

    const translateReason = (reason: string): string => {
      if (!reason) {
        return "";
      }

      // Extract temperature from "Perfect temperature (X°C)"
      const perfectTempMatch = reason.match(/Perfect temperature \((-?\d+)°C\)/);
      if (perfectTempMatch) {
        const translated = t("reasons.perfectTemp", { temp: perfectTempMatch[1] });
        // Check if translation was found (not the key itself and not empty)
        if (translated && !translated.startsWith("reasons.")) {
          return translated;
        }
        return reason; // Fallback to original
      }

      // Extract humidity from "Ideal humidity (X%)"
      const idealHumidityMatch = reason.match(/Ideal humidity \((-?\d+)%\)/);
      if (idealHumidityMatch) {
        const translated = t("reasons.idealHumidity", { humidity: idealHumidityMatch[1] });
        if (translated && !translated.startsWith("reasons.")) {
          return translated;
        }
        return reason;
      }

      // Extract hours from "Will be ready to climb in ~X hours"
      const readyInHoursMatch = reason.match(/Will be ready to climb in ~(\d+) hours/);
      if (readyInHoursMatch) {
        const translated = t("reasons.readyInHours", { hours: readyInHoursMatch[1] });
        if (translated && !translated.startsWith("reasons.")) {
          return translated;
        }
        return reason;
      }

      // Extract rock type from "Cold but good for X friction"
      const coldFrictionMatch = reason.match(/Cold but good for (\w+) friction/);
      if (coldFrictionMatch) {
        const translated = t("reasons.coldGoodFriction", { rockType: coldFrictionMatch[1] });
        if (translated && !translated.startsWith("reasons.")) {
          return translated;
        }
        return reason;
      }

      // Simple string matches
      if (reason === "Temperature too high - fingers may slip") {
        const translated = t("reasons.tempTooHigh");
        return translated && !translated.startsWith("reasons.") ? translated : reason;
      }
      if (reason === "Low humidity aids friction on granite") {
        const translated = t("reasons.lowHumidityGranite");
        return translated && !translated.startsWith("reasons.") ? translated : reason;
      }
      if (reason === "Conditions are acceptable") {
        const translated = t("reasons.acceptable");
        return translated && !translated.startsWith("reasons.") ? translated : reason;
      }

      // Return original if no match
      return reason;
    };

    const translateWeather = (description: string): string => {
      if (!description) {
        return "";
      }

      const weatherMap: Record<string, string> = {
        "Clear sky": "weather.clearSky",
        "Mainly clear": "weather.mainlyClear",
        "Partly cloudy": "weather.partlyCloudy",
        Overcast: "weather.overcast",
        Fog: "weather.fog",
        "Depositing rime fog": "weather.depositingRimeFog",
        "Light drizzle": "weather.lightDrizzle",
        "Moderate drizzle": "weather.moderateDrizzle",
        "Dense drizzle": "weather.denseDrizzle",
        "Light freezing drizzle": "weather.lightFreezingDrizzle",
        "Dense freezing drizzle": "weather.denseFreezingDrizzle",
        "Slight rain": "weather.slightRain",
        "Moderate rain": "weather.moderateRain",
        "Heavy rain": "weather.heavyRain",
        "Light freezing rain": "weather.lightFreezingRain",
        "Heavy freezing rain": "weather.heavyFreezingRain",
        "Slight snow fall": "weather.slightSnowFall",
        "Moderate snow fall": "weather.moderateSnowFall",
        "Heavy snow fall": "weather.heavySnowFall",
        "Snow grains": "weather.snowGrains",
        "Slight rain showers": "weather.slightRainShowers",
        "Moderate rain showers": "weather.moderateRainShowers",
        "Violent rain showers": "weather.violentRainShowers",
        "Slight snow showers": "weather.slightSnowShowers",
        "Heavy snow showers": "weather.heavySnowShowers",
        Thunderstorm: "weather.thunderstorm",
        "Thunderstorm with slight hail": "weather.thunderstormSlightHail",
        "Thunderstorm with heavy hail": "weather.thunderstormHeavyHail",
      };

      const key = weatherMap[description];
      return key ? t(key) : description;
    };

    const translateWarning = (warning: string): string => {
      if (!warning) {
        return "";
      }

      // "Too warm for X (Y°C)"
      const tooWarmMatch = warning.match(/Too warm for (\w+) \((-?\d+)°C\)/);
      if (tooWarmMatch) {
        return t("warnings.tooWarm", { rockType: tooWarmMatch[1], temp: tooWarmMatch[2] });
      }

      // "Cold and suboptimal for X"
      const coldSuboptimalMatch = warning.match(/Cold and suboptimal for (\w+)/);
      if (coldSuboptimalMatch) {
        return t("warnings.coldSuboptimal", { rockType: coldSuboptimalMatch[1] });
      }

      // "High humidity (X%) - rock can be slippery"
      const highHumidityMatch = warning.match(/High humidity \((-?\d+)%\) - rock can be slippery/);
      if (highHumidityMatch) {
        return t("warnings.highHumidity", { humidity: highHumidityMatch[1] });
      }

      // "Very high winds (X km/h) - danger of blown off"
      const veryHighWindsMatch = warning.match(
        /Very high winds \((-?\d+) km\/h\) - danger of blown off/
      );
      if (veryHighWindsMatch) {
        return t("warnings.veryHighWinds", { wind: veryHighWindsMatch[1] });
      }

      // "High wind (X km/h)"
      const highWindMatch = warning.match(/High wind \((-?\d+) km\/h\)/);
      if (highWindMatch) {
        return t("warnings.highWind", { wind: highWindMatch[1] });
      }

      // "Recent precipitation (X.Xmm) - will dry in ~Yh"
      const recentPrecipMatch = warning.match(
        /Recent precipitation \(([0-9.]+)mm\) - will dry in ~(\d+)h/
      );
      if (recentPrecipMatch) {
        return t("warnings.recentPrecip", {
          precip: recentPrecipMatch[1],
          hours: recentPrecipMatch[2],
        });
      }

      // Simple string matches
      if (
        warning === "Rock is currently wet - dangerous to climb (sandstone becomes weak when wet)"
      ) {
        return t("warnings.wetDangerousSandstone");
      }
      if (warning === "Rock is currently wet - slippery conditions") {
        return t("warnings.wetSlippery");
      }
      if (warning === "Currently wet - dangerous") {
        return t("warnings.currentlyWetDangerous");
      }
      if (warning === "Currently wet") {
        return t("warnings.currentlyWet");
      }

      return warning;
    };

    const translateTimeframe = (timeframe: string): string => {
      if (!timeframe) {
        return "";
      }
      const timeframeLower = timeframe.toLowerCase();

      // Map common timeframe strings to translation keys
      const timeframeMap: Record<string, string> = {
        now: "timeframes.now",
        today: "timeframes.today",
        tomorrow: "timeframes.tomorrow",
        "this afternoon": "timeframes.thisAfternoon",
        "this evening": "timeframes.thisEvening",
        tonight: "timeframes.tonight",
      };

      const key = timeframeMap[timeframeLower];
      return key ? t(key) : timeframe;
    };

    return {
      translateRating,
      translateReason,
      translateWeather,
      translateWarning,
      translateTimeframe,
    };
  }, [t]);
}
