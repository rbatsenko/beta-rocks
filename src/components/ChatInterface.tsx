"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Sun, Info, CloudSun } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { ConditionsDetailDialog } from "@/components/ConditionsDetailDialog";
import { getWeatherEmoji, getWeatherDescription } from "@/lib/utils/weather-emojis";

interface ConditionsData {
  location: string;
  locationDetails?: string; // Optional region/country or path info
  timeframe?: string; // Optional timeframe (e.g., "now", "tomorrow", "this afternoon")
  rating: string;
  frictionScore: number;
  reasons?: string[];
  warnings?: string[];
  isDry: boolean;
  dryingTimeHours?: number;
  current?: {
    temperature_c: number;
    humidity: number;
    windSpeed_kph: number;
    precipitation_mm: number;
    weatherCode: number;
  };
  hourlyConditions?: Array<{
    time: string;
    temp_c: number;
    humidity: number;
    wind_kph: number;
    precip_mm: number;
    frictionScore: number;
    rating: string;
    isDry: boolean;
    warnings: string[];
    weatherCode?: number;
  }>;
  optimalWindows?: Array<{
    startTime: string;
    endTime: string;
    avgFrictionScore: number;
    rating: string;
    hourCount: number;
  }>;
  precipitationContext?: {
    last24h: number;
    last48h: number;
    next24h: number;
  };
  dewPointSpread?: number;
  optimalTime?: string;
  astro?: {
    sunrise: string;
    sunset: string;
  };
  dailyForecast?: Array<{
    date: string;
    tempMax: number;
    tempMin: number;
    precipitation: number;
    windSpeedMax: number;
    sunrise: string;
    sunset: string;
    weatherCode: number;
  }>;
}

interface DisambiguationResult {
  disambiguate: true;
  message: string;
  translationKey?: string;
  translationParams?: Record<string, string | number>;
  source?: string;
  options: Array<{
    id: string;
    name: string;
    location: string;
    latitude: number;
    longitude: number;
    rockType?: string;
  }>;
}

const ChatInterface = () => {
  const { t, language } = useClientTranslation('common');
  const [input, setInput] = useState("");
  const { messages, sendMessage } = useChat();
  const isLoading = messages.length > 0 && messages[messages.length - 1].role === "user";
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedConditions, setSelectedConditions] = useState<ConditionsData | null>(null);

  // Helper to detect if it's night time (7pm-7am)
  const isNightTime = (dateOrHour: Date | number): boolean => {
    const hour = typeof dateOrHour === 'number' ? dateOrHour : dateOrHour.getHours();
    return hour >= 19 || hour < 7;
  };

  // Translate rating strings
  const translateRating = (rating: string): string => {
    const ratingLower = rating.toLowerCase();
    const key = `ratings.${ratingLower}`;
    return t(key);
  };

  // Translate reason strings from backend
  const translateReason = (reason: string): string => {
    // Extract temperature from "Perfect temperature (X°C)"
    const perfectTempMatch = reason.match(/Perfect temperature \((\d+)°C\)/);
    if (perfectTempMatch) {
      return t('reasons.perfectTemp', { temp: perfectTempMatch[1] });
    }

    // Extract humidity from "Ideal humidity (X%)"
    const idealHumidityMatch = reason.match(/Ideal humidity \((\d+)%\)/);
    if (idealHumidityMatch) {
      return t('reasons.idealHumidity', { humidity: idealHumidityMatch[1] });
    }

    // Extract hours from "Will be ready to climb in ~X hours"
    const readyInHoursMatch = reason.match(/Will be ready to climb in ~(\d+) hours/);
    if (readyInHoursMatch) {
      return t('reasons.readyInHours', { hours: readyInHoursMatch[1] });
    }

    // Extract rock type from "Cold but good for X friction"
    const coldFrictionMatch = reason.match(/Cold but good for (\w+) friction/);
    if (coldFrictionMatch) {
      return t('reasons.coldGoodFriction', { rockType: coldFrictionMatch[1] });
    }

    // Simple string matches
    if (reason === "Temperature too high - fingers may slip") {
      return t('reasons.tempTooHigh');
    }
    if (reason === "Low humidity aids friction on granite") {
      return t('reasons.lowHumidityGranite');
    }
    if (reason === "Conditions are acceptable") {
      return t('reasons.acceptable');
    }

    // Return original if no match
    return reason;
  };

  // Translate weather description strings
  const translateWeather = (description: string): string => {
    const weatherMap: Record<string, string> = {
      'Clear sky': 'weather.clearSky',
      'Mainly clear': 'weather.mainlyClear',
      'Partly cloudy': 'weather.partlyCloudy',
      'Overcast': 'weather.overcast',
      'Fog': 'weather.fog',
      'Depositing rime fog': 'weather.depositingRimeFog',
      'Light drizzle': 'weather.lightDrizzle',
      'Moderate drizzle': 'weather.moderateDrizzle',
      'Dense drizzle': 'weather.denseDrizzle',
      'Light freezing drizzle': 'weather.lightFreezingDrizzle',
      'Dense freezing drizzle': 'weather.denseFreezingDrizzle',
      'Slight rain': 'weather.slightRain',
      'Moderate rain': 'weather.moderateRain',
      'Heavy rain': 'weather.heavyRain',
      'Light freezing rain': 'weather.lightFreezingRain',
      'Heavy freezing rain': 'weather.heavyFreezingRain',
      'Slight snow fall': 'weather.slightSnowFall',
      'Moderate snow fall': 'weather.moderateSnowFall',
      'Heavy snow fall': 'weather.heavySnowFall',
      'Snow grains': 'weather.snowGrains',
      'Slight rain showers': 'weather.slightRainShowers',
      'Moderate rain showers': 'weather.moderateRainShowers',
      'Violent rain showers': 'weather.violentRainShowers',
      'Slight snow showers': 'weather.slightSnowShowers',
      'Heavy snow showers': 'weather.heavySnowShowers',
      'Thunderstorm': 'weather.thunderstorm',
      'Thunderstorm with slight hail': 'weather.thunderstormSlightHail',
      'Thunderstorm with heavy hail': 'weather.thunderstormHeavyHail',
    };

    const key = weatherMap[description];
    return key ? t(key) : description;
  };

  // Translate warning strings from backend
  const translateWarning = (warning: string): string => {
    // "Too warm for X (Y°C)"
    const tooWarmMatch = warning.match(/Too warm for (\w+) \((\d+)°C\)/);
    if (tooWarmMatch) {
      return t('warnings.tooWarm', { rockType: tooWarmMatch[1], temp: tooWarmMatch[2] });
    }

    // "Cold and suboptimal for X"
    const coldSuboptimalMatch = warning.match(/Cold and suboptimal for (\w+)/);
    if (coldSuboptimalMatch) {
      return t('warnings.coldSuboptimal', { rockType: coldSuboptimalMatch[1] });
    }

    // "High humidity (X%) - rock can be slippery"
    const highHumidityMatch = warning.match(/High humidity \((\d+)%\) - rock can be slippery/);
    if (highHumidityMatch) {
      return t('warnings.highHumidity', { humidity: highHumidityMatch[1] });
    }

    // "Very high winds (X km/h) - danger of blown off"
    const veryHighWindsMatch = warning.match(/Very high winds \((\d+) km\/h\) - danger of blown off/);
    if (veryHighWindsMatch) {
      return t('warnings.veryHighWinds', { wind: veryHighWindsMatch[1] });
    }

    // "High wind (X km/h)"
    const highWindMatch = warning.match(/High wind \((\d+) km\/h\)/);
    if (highWindMatch) {
      return t('warnings.highWind', { wind: highWindMatch[1] });
    }

    // Simple string matches
    if (warning === "Rock is currently wet - dangerous to climb (sandstone becomes weak when wet)") {
      return t('warnings.wetDangerousSandstone');
    }
    if (warning === "Rock is currently wet - slippery conditions") {
      return t('warnings.wetSlippery');
    }
    if (warning === "Currently wet - dangerous") {
      return t('warnings.currentlyWetDangerous');
    }
    if (warning === "Currently wet") {
      return t('warnings.currentlyWet');
    }

    return warning;
  };

  // Translate timeframe strings from backend
  const translateTimeframe = (timeframe: string): string => {
    const timeframeLower = timeframe.toLowerCase();

    // Map common timeframe strings to translation keys
    const timeframeMap: Record<string, string> = {
      'now': 'timeframes.now',
      'today': 'timeframes.today',
      'tomorrow': 'timeframes.tomorrow',
      'this afternoon': 'timeframes.thisAfternoon',
      'this evening': 'timeframes.thisEvening',
      'tonight': 'timeframes.tonight',
    };

    const key = timeframeMap[timeframeLower];
    return key ? t(key) : timeframe;
  };

  const exampleQueries = [
    {
      display: t('welcome.exampleQueries.query1.display'),
      query: t('welcome.exampleQueries.query1.query'),
    },
    {
      display: t('welcome.exampleQueries.query2.display'),
      query: t('welcome.exampleQueries.query2.query'),
    },
    {
      display: t('welcome.exampleQueries.query3.display'),
      query: t('welcome.exampleQueries.query3.query'),
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    sendMessage(
      { text: userMessage },
      {
        body: {
          language: language,
        },
      }
    );
  };

  const handleExampleClick = (queryText: string) => {
    setInput("");
    sendMessage(
      { text: queryText },
      {
        body: {
          language: language,
        },
      }
    );
  };

  return (
    <>
      <div className="flex flex-col h-dvh">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container flex h-16 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <CloudSun className="w-6 h-6 text-orange-500" />
              <h1 className="text-xl font-bold">{t('header.title')}</h1>
            </Link>
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </div>
        </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Conversation className="flex-1">
          <ConversationContent className="container max-w-3xl px-4 py-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center mb-6">
                    <CloudSun className="w-10 h-10 text-orange-500" />
                  </div>
                  <h2 className="text-3xl font-bold mb-3">{t('welcome.heading')}</h2>
                  <p className="text-muted-foreground mb-8 max-w-md text-base">
                    {t('welcome.description')}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                    {exampleQueries.map((example, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => handleExampleClick(example.query)}
                        className="transition-smooth hover:scale-105"
                      >
                        {example.display}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  // Check if any tool is currently executing
                  const hasExecutingTool = message.role === "assistant" && message.parts.some(
                    (part) => part.type.startsWith("tool-") && "state" in part && part.state !== "output-available"
                  );

                  // Check if message has any content to show
                  const hasContent = message.parts.some(
                    (part) => part.type === "text" || ("state" in part && part.state === "output-available")
                  );

                  return (
                    <Message key={message.id} from={message.role}>
                      <MessageContent
                        variant={message.role === "assistant" ? "flat" : "contained"}
                        className={message.role === "user" ? "bg-gradient-to-br from-orange-500 to-orange-400 dark:from-orange-950/50 dark:to-orange-900/30 border-orange-600 dark:border-orange-800/50 shadow-md text-orange-950 dark:text-inherit" : ""}
                      >
                        {hasExecutingTool && !hasContent && (
                          <div className="flex items-center gap-3 py-1">
                            <div className="flex gap-1.5">
                              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                            </div>
                            <span className="text-sm text-muted-foreground">{t('chat.analyzing')}</span>
                          </div>
                        )}
                        {message.parts.map((part, i) => {
                          // Check if message has successful tool results
                          const hasToolResults = message.parts.some(
                            (p) => p.type.startsWith("tool-") && "state" in p && p.state === "output-available"
                          );

                          // Render text parts only if there are no tool results
                          if (part.type === "text") {
                            // Skip text if we have tool results (conditions data or disambiguation)
                            if (hasToolResults) {
                              return null;
                            }
                            return <Response key={i}>{part.text}</Response>;
                          }

                          // Render tool results for assistant messages
                          if (
                            message.role === "assistant" &&
                            part.type === "tool-get_conditions" &&
                            part.state === "output-available"
                          ) {
                            const result = part.output as ConditionsData | DisambiguationResult;

                            // Handle disambiguation results
                            if ("disambiguate" in result && result.disambiguate) {
                              const displayMessage = result.translationKey && result.translationParams
                                ? t(result.translationKey, result.translationParams)
                                : result.message;

                              return (
                                <div key={i} className="mt-3 space-y-2">
                                  <p className="text-sm font-medium">{displayMessage}</p>
                                  <div className="flex flex-wrap gap-2 overflow-visible">
                                    {result.options.map((option, idx) => (
                                      <Button
                                        key={option.id}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const queryText = t('disambiguation.queryTemplate', {
                                            name: option.name + (option.rockType ? ` ${option.rockType}` : ""),
                                            latitude: option.latitude,
                                            longitude: option.longitude,
                                          });
                                          sendMessage(
                                            { text: queryText },
                                            {
                                              body: {
                                                language: language,
                                              },
                                            }
                                          );
                                        }}
                                        className="flex flex-col items-start h-auto py-2 px-3 overflow-visible animate-in fade-in slide-in-from-bottom-2 duration-500"
                                        style={{ animationDelay: `${idx * 100}ms` }}
                                      >
                                        <span className="font-semibold text-sm">{option.name}</span>
                                        <span className="text-xs opacity-70">
                                          {option.location}
                                          {option.rockType && (
                                            <span className="ml-1.5 text-orange-600 dark:text-orange-400">
                                              • {option.rockType}
                                            </span>
                                          )}
                                        </span>
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              );
                            }

                            // Handle regular conditions results
                            const conditionsResult = result as ConditionsData;
                            return (
                              <div
                                key={i}
                                className="mt-3 bg-muted/50 rounded-lg p-3 sm:p-4 border border-border max-w-full overflow-hidden"
                              >
                                <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                                  {/* Weather emoji display */}
                                  {conditionsResult.current?.weatherCode !== undefined && (
                                    <div className="shrink-0">
                                      <div
                                        className="text-3xl sm:text-4xl"
                                        title={translateWeather(getWeatherDescription(conditionsResult.current.weatherCode))}
                                      >
                                        {getWeatherEmoji(conditionsResult.current.weatherCode, isNightTime(new Date()))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
                                    <div className="space-y-0.5 sm:space-y-1">
                                      <div className="font-semibold text-base">
                                        🧗 {conditionsResult.location}
                                        {conditionsResult.timeframe && conditionsResult.timeframe !== "now" && (
                                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                                            ({translateTimeframe(conditionsResult.timeframe)})
                                          </span>
                                        )}
                                      </div>
                                      {conditionsResult.locationDetails && (
                                        <div className="text-xs text-muted-foreground">
                                          📍 {conditionsResult.locationDetails}
                                        </div>
                                      )}
                                      {conditionsResult.current?.weatherCode !== undefined && (
                                        <div className="text-xs text-muted-foreground">
                                          {translateWeather(getWeatherDescription(conditionsResult.current.weatherCode))}
                                        </div>
                                      )}
                                    </div>
                                    <div className="font-medium">
                                      {t('conditions.rating')}: {translateRating(conditionsResult.rating)} ({conditionsResult.frictionScore}
                                      /5)
                                    </div>
                                    {conditionsResult.warnings && conditionsResult.warnings.length > 0 && (
                                      <div className="text-destructive font-semibold text-sm">
                                        ⚠️ {conditionsResult.warnings.map(translateWarning).join(", ")}
                                      </div>
                                    )}
                                    {conditionsResult.reasons && conditionsResult.reasons.length > 0 && (
                                      <div className="text-sm opacity-80">
                                        {conditionsResult.reasons.map(translateReason).join(", ")}
                                      </div>
                                    )}
                                  </div>
                                  {(conditionsResult.hourlyConditions ||
                                    conditionsResult.optimalWindows) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="shrink-0 self-start"
                                      onClick={() => {
                                        setSelectedConditions(conditionsResult);
                                        setDetailsDialogOpen(true);
                                      }}
                                    >
                                      <Info className="w-4 h-4 mr-1" />
                                      {t('conditions.details')}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          return null;
                        })}
                      </MessageContent>
                      {message.role === "assistant" && (
                        <div className="size-8 shrink-0 rounded-full bg-orange-500/10 flex items-center justify-center">
                          <Sun className="size-5 text-orange-500" strokeWidth={2} />
                        </div>
                      )}
                    </Message>
                  );
                })
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('chat.thinking')}</span>
                  </div>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </div>

        {/* Input */}
        <div className="border-t bg-background">
          <div className="container max-w-3xl px-4 py-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('chat.inputPlaceholder')}
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
            {/* Footer Links */}
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                {t('footer.about')}
              </a>
              <span>•</span>
              <a href="#" className="hover:text-foreground transition-colors">
                {t('footer.privacy')}
              </a>
              <span>•</span>
              <a
                href="https://github.com/rbatsenko/temps-rocks"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                {t('footer.github')}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Conditions Detail Dialog */}
      {selectedConditions && (
        <ConditionsDetailDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          data={selectedConditions}
        />
      )}
    </>
  );
};

export default ChatInterface;
