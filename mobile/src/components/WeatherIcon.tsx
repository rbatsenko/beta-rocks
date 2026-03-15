/**
 * Weather icon component based on WMO weather codes
 * Matches the web app's weather emoji mapping
 */

import { Text, StyleSheet } from "react-native";

const WMO_CODES: Record<number, string> = {
  0: "☀️",   // Clear sky
  1: "🌤️",  // Mainly clear
  2: "⛅",    // Partly cloudy
  3: "☁️",   // Overcast
  45: "🌫️", // Fog
  48: "🌫️", // Depositing rime fog
  51: "🌦️", // Light drizzle
  53: "🌦️", // Moderate drizzle
  55: "🌧️", // Dense drizzle
  61: "🌧️", // Slight rain
  63: "🌧️", // Moderate rain
  65: "🌧️", // Heavy rain
  71: "🌨️", // Slight snow
  73: "🌨️", // Moderate snow
  75: "❄️",  // Heavy snow
  77: "🌨️", // Snow grains
  80: "🌦️", // Slight rain showers
  81: "🌧️", // Moderate rain showers
  82: "⛈️",  // Violent rain showers
  85: "🌨️", // Slight snow showers
  86: "🌨️", // Heavy snow showers
  95: "⛈️",  // Thunderstorm
  96: "⛈️",  // Thunderstorm with slight hail
  99: "⛈️",  // Thunderstorm with heavy hail
};

interface WeatherIconProps {
  code: number;
  size?: "small" | "medium" | "large";
}

export function WeatherIcon({ code, size = "medium" }: WeatherIconProps) {
  const emoji = WMO_CODES[code] || "🌡️";

  return (
    <Text
      style={[
        styles.emoji,
        size === "small" && styles.small,
        size === "large" && styles.large,
      ]}
    >
      {emoji}
    </Text>
  );
}

const styles = StyleSheet.create({
  emoji: {
    fontSize: 24,
  },
  small: {
    fontSize: 16,
  },
  large: {
    fontSize: 36,
  },
});
