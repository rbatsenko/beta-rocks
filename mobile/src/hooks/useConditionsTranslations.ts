/**
 * Hook for translating weather condition strings
 * Ported from web: src/hooks/useConditionsTranslations.ts
 */

import { useMemo } from "react";
import { useUserProfile } from "./useUserProfile";
import {
  convertTemperature,
  convertWindSpeed,
  convertPrecipitation,
  formatTemperature,
  formatWindSpeed,
  formatPrecipitation,
} from "../lib/units";

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export function getWeatherDescription(code: number): string {
  return WMO_DESCRIPTIONS[code] || "Unknown";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useConditionsTranslations(t: any) {
  const { units } = useUserProfile();

  return useMemo(() => {
    const translateRating = (rating: string): string => {
      if (!rating) return "";
      return t(`ratings.${rating.toLowerCase()}`);
    };

    const translateReason = (reason: string): string => {
      if (!reason) return "";

      const perfectTempMatch = reason.match(/Perfect temperature \((-?\d+)°C\)/);
      if (perfectTempMatch) {
        const tempCelsius = parseFloat(perfectTempMatch[1]);
        const convertedTemp = convertTemperature(tempCelsius, "celsius", units.temperature);
        const tempFormatted = formatTemperature(convertedTemp, units.temperature, 0);
        const translated = t("reasons.perfectTemp", { temp: tempFormatted });
        if (translated && !translated.startsWith("reasons.")) return translated;
        return reason;
      }

      const goodHumidityMatch = reason.match(/(?:Good|Ideal) humidity \((-?\d+)%\)/);
      if (goodHumidityMatch) {
        const translated = t("reasons.goodHumidity", { humidity: goodHumidityMatch[1] });
        if (translated && !translated.startsWith("reasons.")) return translated;
        return reason;
      }

      const lowCondensationMatch = reason.match(
        /Low condensation risk \(dew point spread ([\d.]+)°C\)/
      );
      if (lowCondensationMatch) {
        const dewPointCelsius = parseFloat(lowCondensationMatch[1]);
        const convertedTemp = convertTemperature(dewPointCelsius, "celsius", units.temperature);
        const tempFormatted = formatTemperature(convertedTemp, units.temperature, 1);
        const translated = t("reasons.lowCondensationRisk", { dewPointSpread: tempFormatted });
        if (translated && !translated.startsWith("reasons.")) return translated;
        return reason;
      }

      const readyInHoursMatch = reason.match(/Will be ready to climb in ~(\d+) hours/);
      if (readyInHoursMatch) {
        const translated = t("reasons.readyInHours", { hours: readyInHoursMatch[1] });
        if (translated && !translated.startsWith("reasons.")) return translated;
        return reason;
      }

      const coldFrictionMatch = reason.match(/Cold but good for (\w+) friction/);
      if (coldFrictionMatch) {
        const translated = t("reasons.coldGoodFriction", { rockType: coldFrictionMatch[1] });
        if (translated && !translated.startsWith("reasons.")) return translated;
        return reason;
      }

      if (reason === "Temperature too high - fingers may slip") {
        const translated = t("reasons.tempTooHigh");
        return translated && !translated.startsWith("reasons.") ? translated : reason;
      }
      if (
        reason === "Low humidity aids friction on granite" ||
        reason === "Low humidity aids friction"
      ) {
        const translated = t("reasons.lowHumidityFriction");
        return translated && !translated.startsWith("reasons.") ? translated : reason;
      }
      if (reason === "Conditions are acceptable") {
        const translated = t("reasons.acceptable");
        return translated && !translated.startsWith("reasons.") ? translated : reason;
      }

      return reason;
    };

    const translateWeather = (description: string): string => {
      if (!description) return "";

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
      if (!warning) return "";

      const tooWarmMatch = warning.match(/Too warm(?: for (\w+))? \((-?\d+)°C\)/);
      if (tooWarmMatch) {
        const rockType = tooWarmMatch[1] || "";
        const tempCelsius = parseFloat(tooWarmMatch[2]);
        const convertedTemp = convertTemperature(tempCelsius, "celsius", units.temperature);
        const tempFormatted = formatTemperature(convertedTemp, units.temperature, 0);
        if (rockType) {
          return t("warnings.tooWarm", { rockType, temp: tempFormatted });
        }
        return t("warnings.tooWarm", { rockType: "", temp: tempFormatted }).replace(" for ", "");
      }

      const coldMatch = warning.match(/Cold(?: and suboptimal for (\w+)| \((-?\d+)°C\))/);
      if (coldMatch) {
        if (coldMatch[1]) {
          return t("warnings.coldSuboptimal", { rockType: coldMatch[1] });
        } else if (coldMatch[2]) {
          const tempCelsius = parseFloat(coldMatch[2]);
          const convertedTemp = convertTemperature(tempCelsius, "celsius", units.temperature);
          const tempFormatted = formatTemperature(convertedTemp, units.temperature, 0);
          return (
            t("warnings.cold", { temp: tempFormatted }) ||
            t("warnings.coldSuboptimal", { rockType: "" }).replace(" for ", "")
          );
        }
      }

      const highHumidityMatch = warning.match(
        /High humidity \((-?\d+)%\)(?:\s*-\s*rock can be slippery)?/
      );
      if (highHumidityMatch) {
        return t("warnings.highHumidity", { humidity: highHumidityMatch[1] });
      }

      const veryHighCondensationMatch = warning.match(
        /Very high condensation risk \(dew point spread ([\d.]+)°C\) - rock surface likely damp/
      );
      if (veryHighCondensationMatch) {
        const dewPointCelsius = parseFloat(veryHighCondensationMatch[1]);
        const convertedTemp = convertTemperature(dewPointCelsius, "celsius", units.temperature);
        const tempFormatted = formatTemperature(convertedTemp, units.temperature, 1);
        return t("warnings.veryHighCondensationRisk", { dewPointSpread: tempFormatted });
      }

      const highCondensationMatch = warning.match(
        /High condensation risk(?: \(dew point spread ([\d.]+)°C\))?/
      );
      if (highCondensationMatch) {
        if (highCondensationMatch[1]) {
          const dewPointCelsius = parseFloat(highCondensationMatch[1]);
          const convertedTemp = convertTemperature(dewPointCelsius, "celsius", units.temperature);
          const tempFormatted = formatTemperature(convertedTemp, units.temperature, 1);
          return t("warnings.highCondensationRisk", { dewPointSpread: tempFormatted });
        }
        return t("warnings.highCondensationRiskSimple");
      }

      const moderateCondensationMatch = warning.match(
        /Moderate condensation risk \(dew point spread ([\d.]+)°C\)/
      );
      if (moderateCondensationMatch) {
        const dewPointCelsius = parseFloat(moderateCondensationMatch[1]);
        const convertedTemp = convertTemperature(dewPointCelsius, "celsius", units.temperature);
        const tempFormatted = formatTemperature(convertedTemp, units.temperature, 1);
        return t("warnings.moderateCondensationRisk", { dewPointSpread: tempFormatted });
      }

      const condensationRiskMatch = warning.match(/Condensation risk \(([\d.]+)°C\)/);
      if (condensationRiskMatch) {
        const dewPointCelsius = parseFloat(condensationRiskMatch[1]);
        const convertedTemp = convertTemperature(dewPointCelsius, "celsius", units.temperature);
        const tempFormatted = formatTemperature(convertedTemp, units.temperature, 1);
        return t("warnings.condensationRisk", { dewPointSpread: tempFormatted });
      }

      const veryHighWindsMatch = warning.match(
        /Very high winds \((-?\d+) km\/h\) - danger of blown off/
      );
      if (veryHighWindsMatch) {
        const windKmh = parseFloat(veryHighWindsMatch[1]);
        const convertedWind = convertWindSpeed(windKmh, "kmh", units.windSpeed);
        const windFormatted = formatWindSpeed(convertedWind, units.windSpeed, 0);
        return t("warnings.veryHighWinds", { wind: windFormatted });
      }

      const highWindMatch = warning.match(/High wind \((-?\d+) km\/h\)/);
      if (highWindMatch) {
        const windKmh = parseFloat(highWindMatch[1]);
        const convertedWind = convertWindSpeed(windKmh, "kmh", units.windSpeed);
        const windFormatted = formatWindSpeed(convertedWind, units.windSpeed, 0);
        return t("warnings.highWind", { wind: windFormatted });
      }

      const recentPrecipMatch = warning.match(
        /Recent precipitation \(([0-9.]+)mm\) - will dry in ~(\d+)h/
      );
      if (recentPrecipMatch) {
        const precipMm = parseFloat(recentPrecipMatch[1]);
        const convertedPrecip = convertPrecipitation(precipMm, "mm", units.precipitation);
        const precipFormatted = formatPrecipitation(convertedPrecip, units.precipitation, 1);
        return t("warnings.recentPrecip", {
          precip: precipFormatted,
          hours: recentPrecipMatch[2],
        });
      }

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

    return {
      translateRating,
      translateReason,
      translateWeather,
      translateWarning,
    };
  }, [t, units]);
}
