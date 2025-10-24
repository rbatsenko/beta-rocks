"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, CloudSun, Sun, Info } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { useConditionsTranslations } from "@/hooks/useConditionsTranslations";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { useStickToBottomContext } from "use-stick-to-bottom";

// Helper component: triggers scroll within StickToBottom context when `signal` changes
const ScrollToBottomOnSignal = ({ signal }: { signal: number }) => {
  const { scrollToBottom } = useStickToBottomContext();
  useEffect(() => {
    try {
      scrollToBottom();
      setTimeout(() => scrollToBottom(), 0);
    } catch {}
  }, [signal, scrollToBottom]);
  return null;
};
import { ConditionsDetailDialog } from "@/components/ConditionsDetailDialog";
import { ConditionsDetailSheet } from "@/components/ConditionsDetailSheet";
import { WeatherConditionCard } from "@/components/WeatherConditionCard";
import { DisambiguationOptions } from "@/components/DisambiguationOptions";
import { FeaturesDialog } from "@/components/FeaturesDialog";
import { logRender } from "@/lib/debug/render-log";

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
  latitude?: number;
  longitude?: number;
  country?: string;
  state?: string;
  municipality?: string;
  village?: string;
  rockType?: string;
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

interface PrefetchedFullData {
  location: { lat: number; lon: number };
  rockType: string;
  current: {
    temperature_c: number;
    humidity: number;
    windSpeed_kph: number;
    precipitation_mm: number;
    weatherCode: number;
  };
  conditions: {
    rating: string;
    frictionRating: number;
    isDry: boolean;
    reasons?: string[];
    warnings?: string[];
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
  };
  astro?: {
    sunrise: string;
    sunset: string;
  };
  updatedAt: string;
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
  const { t, language } = useClientTranslation("common");
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    // Throttle updates to 30ms for smoother text streaming
    experimental_throttle: 30,
  });
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const [selectedConditions, setSelectedConditions] = useState<ConditionsData | null>(null);
  const [featuresDialogOpen, setFeaturesDialogOpen] = useState(false);
  const [scrollSignal, setScrollSignal] = useState(0);
  // Store prefetched full 14-day data keyed by location coordinates
  const [prefetchedDataMap, setPrefetchedDataMap] = useState<Map<string, PrefetchedFullData>>(
    new Map()
  );

  // Get translation functions (memoized)
  const translations = useConditionsTranslations(t);

  // Compute loading state from status (v5 API)
  const isLoading = useMemo(() => status === "submitted" || status === "streaming", [status]);

  // Memoize example queries
  const exampleQueries = useMemo(
    () => [
      {
        display: t("welcome.exampleQueries.query1.display"),
        query: t("welcome.exampleQueries.query1.query"),
      },
      {
        display: t("welcome.exampleQueries.query2.display"),
        query: t("welcome.exampleQueries.query2.query"),
      },
      {
        display: t("welcome.exampleQueries.query3.display"),
        query: t("welcome.exampleQueries.query3.query"),
      },
    ],
    [t]
  );

  // Memoize submit handler
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;

      const userMessage = input.trim();
      setInput("");
      sendMessage(
        { text: userMessage },
        {
          body: {
            language: language,
            userDateTime: new Date().toISOString(),
            userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }
      );
      // Signal scroll to bottom within Conversation provider
      setScrollSignal((s) => s + 1);
    },
    [input, language, sendMessage]
  );

  // Memoize example click handler
  const handleExampleClick = useCallback(
    (queryText: string) => {
      setInput("");
      sendMessage(
        { text: queryText },
        {
          body: {
            language: language,
            userDateTime: new Date().toISOString(),
            userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }
      );
      // Signal scroll to bottom within Conversation provider
      setScrollSignal((s) => s + 1);
    },
    [language, sendMessage]
  );

  // Memoize disambiguation option handler
  const handleDisambiguationSelect = useCallback(
    (queryText: string) => {
      sendMessage(
        { text: queryText },
        {
          body: {
            language: language,
            userDateTime: new Date().toISOString(),
            userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }
      );
    },
    [language, sendMessage]
  );

  // Handle prefetched full data from WeatherConditionCard
  const handleFullDataFetched = useCallback((fullData: PrefetchedFullData) => {
    if (fullData?.location?.lat && fullData?.location?.lon) {
      const key = `${fullData.location.lat},${fullData.location.lon}`;
      setPrefetchedDataMap((prev) => new Map(prev).set(key, fullData));
      console.log("[ChatInterface] Stored prefetched data for", key);
    }
  }, []);

  // Render log for profiling
  logRender("ChatInterface", {
    messages: messages.length,
    status,
    detailsOpen: detailsDialogOpen,
    selected: selectedConditions?.location ?? null,
    inputLen: input.length,
  });

  // (debug logging removed)

  return (
    <>
      <div className="flex flex-col h-dvh">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 sticky top-0 z-50">
          <div className="container flex h-16 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <CloudSun className="w-6 h-6 text-orange-500" />
              <h1 className="text-xl font-bold">{t("header.title")}</h1>
            </Link>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setFeaturesDialogOpen(true)}
                className="rounded-full"
              >
                <Info className="h-5 w-5" />
                <span className="sr-only">{t("ui.aboutApp")}</span>
              </Button>
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Conversation className="flex-1">
            <ScrollToBottomOnSignal signal={scrollSignal} />
            <ConversationContent className="container max-w-3xl px-4 py-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-linear-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center mb-6">
                    <CloudSun className="w-10 h-10 text-orange-500" />
                  </div>
                  <h2 className="text-3xl font-bold mb-3">{t("welcome.heading")}</h2>
                  <p className="text-muted-foreground mb-8 max-w-md text-base">
                    {t("welcome.description")}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                    {exampleQueries.map((example, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => handleExampleClick(example.query)}
                        className="transition-smooth hover:scale-105 whitespace-normal wrap-break-word text-left sm:text-center leading-snug h-auto min-h-9 px-4"
                      >
                        {example.display}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  // Check if any tool is currently executing
                  const hasExecutingTool =
                    message.role === "assistant" &&
                    message.parts.some(
                      (part) =>
                        part.type.startsWith("tool-") &&
                        "state" in part &&
                        part.state !== "output-available"
                    );

                  // Check if message has any content to show
                  const hasContent = message.parts.some(
                    (part) =>
                      part.type === "text" || ("state" in part && part.state === "output-available")
                  );

                  // Prefer showing a single, most-recent assistant text summary above the card
                  // when a tool result is present. This ensures the summary likely reflects
                  // the latest tool output, even if the model emitted early generic text.
                  const isAssistant = message.role === "assistant";
                  const toolOutIdx = isAssistant
                    ? message.parts.findIndex(
                        (p) =>
                          p.type === "tool-get_conditions" &&
                          "state" in p &&
                          p.state === "output-available"
                      )
                    : -1;
                  const lastTextIdx = isAssistant
                    ? (() => {
                        for (let i = message.parts.length - 1; i >= 0; i--) {
                          if (message.parts[i].type === "text") return i;
                        }
                        return -1;
                      })()
                    : -1;
                  const shouldPreferLastText =
                    isAssistant && toolOutIdx !== -1 && lastTextIdx !== -1;

                  return (
                    <Message key={message.id} from={message.role}>
                      <MessageContent
                        variant={message.role === "assistant" ? "flat" : "contained"}
                        className={
                          message.role === "user"
                            ? "bg-linear-to-br from-orange-500 to-orange-400 dark:from-orange-950/50 dark:to-orange-900/30 border-orange-600 dark:border-orange-800/50 shadow-md text-orange-950 dark:text-inherit"
                            : ""
                        }
                      >
                        {hasExecutingTool && !hasContent && (
                          <div className="flex items-center gap-3 py-1">
                            <div className="flex gap-1.5">
                              <div
                                className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
                                style={{ animationDelay: "0ms" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
                                style={{ animationDelay: "150ms" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
                                style={{ animationDelay: "300ms" }}
                              ></div>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {t("chat.analyzing")}
                            </span>
                          </div>
                        )}
                        {message.parts.map((part, i) => {
                          // Render text parts
                          if (part.type === "text") {
                            if (shouldPreferLastText) {
                              // Already rendered the preferred text above; skip all text parts
                              return null;
                            }
                            return (
                              <div
                                key={i}
                                className={
                                  message.role === "assistant"
                                    ? "pb-3 animate-in fade-in-0 duration-500"
                                    : undefined
                                }
                              >
                                <Response>{part.text}</Response>
                              </div>
                            );
                          }

                          // Render tool results for assistant messages
                          if (
                            message.role === "assistant" &&
                            part.type === "tool-get_conditions" &&
                            part.state === "output-available"
                          ) {
                            const result = part.output as
                              | ConditionsData
                              | DisambiguationResult
                              | { error: string; location: string };

                            // Handle error results
                            if ("error" in result && result.error) {
                              return (
                                <div
                                  key={i}
                                  className="bg-destructive/10 border border-destructive/20 rounded-lg p-4"
                                >
                                  <p className="text-destructive font-medium">{result.error}</p>
                                </div>
                              );
                            }

                            // Handle disambiguation results
                            if ("disambiguate" in result && result.disambiguate) {
                              const displayMessage =
                                result.translationKey && result.translationParams
                                  ? t(result.translationKey, result.translationParams)
                                  : result.message;

                              return (
                                <DisambiguationOptions
                                  key={i}
                                  result={result}
                                  displayMessage={displayMessage}
                                  queryTemplate={t("disambiguation.queryTemplate")}
                                  onOptionSelect={handleDisambiguationSelect}
                                />
                              );
                            }

                            // Handle regular conditions results
                            const conditionsResult = result as ConditionsData;

                            // Helper to merge prefetched full data with minimal chat data
                            const getMergedConditions = () => {
                              if (conditionsResult.latitude && conditionsResult.longitude) {
                                const key = `${conditionsResult.latitude},${conditionsResult.longitude}`;
                                const prefetchedData = prefetchedDataMap.get(key);

                                if (prefetchedData?.conditions) {
                                  console.log(
                                    "[ChatInterface] Using prefetched full data for",
                                    key
                                  );
                                  // Merge prefetched full conditions with the base result
                                  return {
                                    ...conditionsResult,
                                    hourlyConditions: prefetchedData.conditions.hourlyConditions,
                                    optimalWindows: prefetchedData.conditions.optimalWindows,
                                    dailyForecast: prefetchedData.conditions.dailyForecast,
                                  };
                                }
                              }
                              return conditionsResult;
                            };

                            return (
                              <WeatherConditionCard
                                key={i}
                                data={conditionsResult}
                                translateWeather={translations.translateWeather}
                                translateRating={translations.translateRating}
                                translateWarning={translations.translateWarning}
                                translateReason={translations.translateReason}
                                onDetailsClick={() => {
                                  setSelectedConditions(getMergedConditions());
                                  setDetailsDialogOpen(true);
                                }}
                                onSheetClick={() => {
                                  setSelectedConditions(getMergedConditions());
                                  setDetailsSheetOpen(true);
                                }}
                                onFullDataFetched={handleFullDataFetched}
                                conditionsLabel={t("conditions.rating")}
                                detailsLabel={t("conditions.details")}
                              />
                            );
                          }

                          return null;
                        })}

                        {/* If we have a tool result and a text part, show only the last text once below the card */}
                        {shouldPreferLastText && message.parts[lastTextIdx]?.type === "text" ? (
                          <div className="mt-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
                            <Response>{message.parts[lastTextIdx].text}</Response>
                          </div>
                        ) : null}
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
              {isLoading &&
                (() => {
                  // Check if any message has an executing tool
                  const hasExecutingTool = messages.some(
                    (message) =>
                      message.role === "assistant" &&
                      message.parts.some(
                        (part) =>
                          part.type.startsWith("tool-") &&
                          "state" in part &&
                          part.state !== "output-available"
                      )
                  );

                  // Only show "Thinking..." if no tool is currently executing
                  // (when a tool is executing, we already show "Analyzing conditions...")
                  if (hasExecutingTool) {
                    return null;
                  }

                  return (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t("chat.thinking")}</span>
                      </div>
                    </div>
                  );
                })()}
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
                placeholder={t("chat.inputPlaceholder")}
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
                {t("footer.about")}
              </a>
              <span>•</span>
              <a href="#" className="hover:text-foreground transition-colors">
                {t("footer.privacy")}
              </a>
              <span>•</span>
              <a
                href="https://github.com/rbatsenko/temps-rocks"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                {t("footer.github")}
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

      {/* Conditions Detail Sheet */}
      {selectedConditions && (
        <ConditionsDetailSheet
          open={detailsSheetOpen}
          onOpenChange={setDetailsSheetOpen}
          data={selectedConditions}
        />
      )}

      {/* Features / About App Dialog */}
      <FeaturesDialog open={featuresDialogOpen} onOpenChange={setFeaturesDialogOpen} />
    </>
  );
};

export default ChatInterface;
