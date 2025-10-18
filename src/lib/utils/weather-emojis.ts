/**
 * Weather icon mapping utility for WMO weather codes
 * Used by Open-Meteo API
 *
 * WMO Weather interpretation codes (WW):
 * 0 - Clear sky
 * 1, 2, 3 - Mainly clear, partly cloudy, and overcast
 * 45, 48 - Fog and depositing rime fog
 * 51, 53, 55 - Drizzle: Light, moderate, and dense intensity
 * 56, 57 - Freezing Drizzle: Light and dense intensity
 * 61, 63, 65 - Rain: Slight, moderate and heavy intensity
 * 66, 67 - Freezing Rain: Light and heavy intensity
 * 71, 73, 75 - Snow fall: Slight, moderate, and heavy intensity
 * 77 - Snow grains
 * 80, 81, 82 - Rain showers: Slight, moderate, and violent
 * 85, 86 - Snow showers slight and heavy
 * 95 - Thunderstorm: Slight or moderate
 * 96, 99 - Thunderstorm with slight and heavy hail
 */

interface WeatherEmojiMapping {
  emoji: string;
  description: string;
}

const WMO_CODE_MAP: Record<number, WeatherEmojiMapping> = {
  // Clear sky
  0: { emoji: '☀️', description: 'Clear sky' },

  // Mainly clear, partly cloudy, and overcast
  1: { emoji: '🌤️', description: 'Mainly clear' },
  2: { emoji: '⛅', description: 'Partly cloudy' },
  3: { emoji: '☁️', description: 'Overcast' },

  // Fog and depositing rime fog
  45: { emoji: '😶‍🌫️', description: 'Fog' },
  48: { emoji: '😶‍🌫️', description: 'Depositing rime fog' },

  // Drizzle: Light, moderate, and dense intensity
  51: { emoji: '🌦️', description: 'Light drizzle' },
  53: { emoji: '🌦️', description: 'Moderate drizzle' },
  55: { emoji: '🌧️', description: 'Dense drizzle' },

  // Freezing Drizzle: Light and dense intensity
  56: { emoji: '🌧️', description: 'Light freezing drizzle' },
  57: { emoji: '🌧️', description: 'Dense freezing drizzle' },

  // Rain: Slight, moderate and heavy intensity
  61: { emoji: '🌧️', description: 'Slight rain' },
  63: { emoji: '🌧️', description: 'Moderate rain' },
  65: { emoji: '🌧️', description: 'Heavy rain' },

  // Freezing Rain: Light and heavy intensity
  66: { emoji: '🌧️', description: 'Light freezing rain' },
  67: { emoji: '🌧️', description: 'Heavy freezing rain' },

  // Snow fall: Slight, moderate, and heavy intensity
  71: { emoji: '🌨️', description: 'Slight snow fall' },
  73: { emoji: '🌨️', description: 'Moderate snow fall' },
  75: { emoji: '❄️', description: 'Heavy snow fall' },

  // Snow grains
  77: { emoji: '🌨️', description: 'Snow grains' },

  // Rain showers: Slight, moderate, and violent
  80: { emoji: '🌦️', description: 'Slight rain showers' },
  81: { emoji: '🌧️', description: 'Moderate rain showers' },
  82: { emoji: '🌧️', description: 'Violent rain showers' },

  // Snow showers slight and heavy
  85: { emoji: '🌨️', description: 'Slight snow showers' },
  86: { emoji: '❄️', description: 'Heavy snow showers' },

  // Thunderstorm: Slight or moderate
  95: { emoji: '⛈️', description: 'Thunderstorm' },

  // Thunderstorm with slight and heavy hail
  96: { emoji: '⛈️', description: 'Thunderstorm with slight hail' },
  99: { emoji: '⛈️', description: 'Thunderstorm with heavy hail' },
};

/**
 * Get weather emoji from WMO weather code
 * @param weatherCode - WMO weather code (0-99)
 * @param isNight - Whether it's nighttime (optional, for moon emoji)
 * @returns Weather emoji string
 */
export function getWeatherEmoji(weatherCode: number, isNight?: boolean): string {
  if (weatherCode === undefined || weatherCode === null) {
    return '🌡️'; // Default thermometer icon
  }

  // Special case: Clear sky at night
  if (weatherCode === 0 && isNight) {
    return '🌙';
  }

  const mapping = WMO_CODE_MAP[weatherCode];
  if (mapping) {
    return mapping.emoji;
  }

  // Fallback for unknown codes
  return '🌡️';
}

/**
 * Get weather description from WMO weather code
 * @param weatherCode - WMO weather code (0-99)
 * @returns Human-readable weather description
 */
export function getWeatherDescription(weatherCode: number): string {
  if (weatherCode === undefined || weatherCode === null) {
    return 'Unknown';
  }

  const mapping = WMO_CODE_MAP[weatherCode];
  if (mapping) {
    return mapping.description;
  }

  return 'Unknown weather condition';
}

/**
 * Get appropriate background gradient based on weather code
 * Useful for weather cards and panels
 */
export function getWeatherGradient(weatherCode: number, isNight?: boolean): string {
  if (weatherCode === undefined || weatherCode === null) {
    return 'bg-gradient-to-br from-gray-500 to-gray-600';
  }

  // Clear sky
  if (weatherCode === 0) {
    return isNight
      ? 'bg-gradient-to-br from-indigo-800 via-purple-800 to-pink-800'
      : 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600';
  }

  // Partly cloudy / mainly clear
  if (weatherCode >= 1 && weatherCode <= 2) {
    return 'bg-gradient-to-br from-blue-300 via-blue-400 to-gray-400';
  }

  // Overcast
  if (weatherCode === 3) {
    return 'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600';
  }

  // Fog
  if (weatherCode === 45 || weatherCode === 48) {
    return 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500';
  }

  // Drizzle and light rain
  if ((weatherCode >= 51 && weatherCode <= 57) || weatherCode === 61 || weatherCode === 80) {
    return 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600';
  }

  // Moderate to heavy rain
  if ((weatherCode >= 63 && weatherCode <= 67) || weatherCode === 81 || weatherCode === 82) {
    return 'bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700';
  }

  // Snow
  if ((weatherCode >= 71 && weatherCode <= 77) || weatherCode === 85 || weatherCode === 86) {
    return 'bg-gradient-to-br from-blue-100 via-blue-200 to-gray-300';
  }

  // Thunderstorm
  if (weatherCode >= 95 && weatherCode <= 99) {
    return 'bg-gradient-to-br from-purple-700 via-purple-800 to-gray-900';
  }

  return 'bg-gradient-to-br from-gray-500 to-gray-600';
}

/**
 * Determine if conditions are favorable for climbing based on weather code
 * @param weatherCode - WMO weather code
 * @returns Object with isFavorable flag and reason
 */
export function getClimbingWeatherStatus(weatherCode: number): {
  isFavorable: boolean;
  reason: string;
} {
  // Clear or mainly clear
  if (weatherCode >= 0 && weatherCode <= 1) {
    return { isFavorable: true, reason: 'Clear conditions' };
  }

  // Partly cloudy
  if (weatherCode === 2) {
    return { isFavorable: true, reason: 'Good conditions with some clouds' };
  }

  // Overcast
  if (weatherCode === 3) {
    return { isFavorable: true, reason: 'Overcast but dry' };
  }

  // Fog
  if (weatherCode === 45 || weatherCode === 48) {
    return { isFavorable: false, reason: 'Poor visibility due to fog' };
  }

  // Any precipitation
  if (weatherCode >= 51) {
    return { isFavorable: false, reason: 'Wet conditions - rock will be slippery' };
  }

  return { isFavorable: false, reason: 'Unknown conditions' };
}
