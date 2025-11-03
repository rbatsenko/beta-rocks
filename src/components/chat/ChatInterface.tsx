"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChat, type UIMessage } from "@ai-sdk/react";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, CloudSun, Sun, Info, RotateCcw, Star, Search } from "lucide-react";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { useConditionsTranslations } from "@/hooks/useConditionsTranslations";
import { useUnits } from "@/hooks/useUnits";
import { useFavorites } from "@/hooks/queries/useFavoritesQueries";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { getUserProfile } from "@/lib/auth/sync-key";
import {
  useCurrentSession,
  useChatMessages,
  useSendMessage,
  useClearSession,
  chatMessageToUIMessage,
  uiMessageToChatMessage,
} from "@/hooks/queries/useChatQueries";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { useModifierKey } from "@/hooks/usePlatform";

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
import { Header } from "@/components/layout/Header";
import { HeaderActions } from "@/components/layout/HeaderActions";
import { ConditionsDetailSheet } from "@/components/conditions/ConditionsDetailSheet";
import { WeatherConditionCard } from "@/components/conditions/WeatherConditionCard";
import { DisambiguationOptions } from "@/components/chat/DisambiguationOptions";
import { FeaturesDialog } from "@/components/dialogs/FeaturesDialog";
import { PrivacyDialog } from "@/components/dialogs/PrivacyDialog";
import { SettingsDialog } from "@/components/profile/SettingsDialog";
import { FavoritesDialog } from "@/components/profile/FavoritesDialog";
import { SearchDialog } from "@/components/dialogs/SearchDialog";
import { logRender } from "@/lib/debug/render-log";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { SyncExplainerDialog } from "@/components/profile/SyncExplainerDialog";
import { StatsDialog } from "@/components/profile/StatsDialog";
import { ProfileCreationModal } from "@/components/profile/ProfileCreationModal";
import { ProfileCreatedDialog } from "@/components/profile/ProfileCreatedDialog";
import type { UserProfile } from "@/lib/auth/sync-key";

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
  cragId?: string; // Crag ID for reports
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

// Separate component that only mounts after history is loaded
// This ensures useChat initializes with the correct messages
const ChatUI = ({
  sessionId,
  initialMessages,
  t,
  language,
}: {
  sessionId: string | undefined;
  initialMessages: UIMessage[];
  t: TFunction;
  language: string;
}) => {
  const modifierKey = useModifierKey();
  const router = useRouter();
  const [input, setInput] = useState("");
  const { units } = useUnits();

  // React Query mutations for message persistence
  const sendMessageMutation = useSendMessage();
  const clearSessionMutation = useClearSession();

  const { messages, sendMessage, status } = useChat({
    // Load initial messages from history
    messages: initialMessages,
    // Throttle updates to 30ms for smoother text streaming
    experimental_throttle: 30,
    // Save messages as they finish streaming (only if user has a session)
    onFinish: async ({ message, messages: allMessages }) => {
      // Skip saving for anonymous users (no session)
      if (!sessionId) return;

      // IMPORTANT: Save user message FIRST to ensure correct chronological order
      // (find the last user message in the array)
      const lastUserMessage = [...allMessages]
        .reverse()
        .find((m) => m.role === "user" && m.id !== message.id);

      if (lastUserMessage) {
        const chatMessage = uiMessageToChatMessage(lastUserMessage, sessionId);
        await sendMessageMutation.mutateAsync({
          sessionId,
          message: chatMessage,
        });
      }

      // Then save the assistant message
      const chatMessage = uiMessageToChatMessage(message, sessionId);
      await sendMessageMutation.mutateAsync({
        sessionId,
        message: chatMessage,
      });
    },
  });

  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const [selectedConditions, setSelectedConditions] = useState<ConditionsData | null>(null);
  const [featuresDialogOpen, setFeaturesDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [favoritesDialogOpen, setFavoritesDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [syncExplainerDialogOpen, setSyncExplainerDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [newChatConfirmOpen, setNewChatConfirmOpen] = useState(false);
  const [scrollSignal, setScrollSignal] = useState(0);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProfileCreated, setShowProfileCreated] = useState(false);
  const [newSyncKey, setNewSyncKey] = useState<string>("");
  const [pendingAction, setPendingAction] = useState<"favorites" | "stats" | "settings" | null>(
    null
  );
  // Store prefetched full 14-day data keyed by location coordinates
  const [prefetchedDataMap, setPrefetchedDataMap] = useState<Map<string, PrefetchedFullData>>(
    new Map()
  );

  // Handler for clearing current session
  const handleNewChat = useCallback(async () => {
    try {
      // For anonymous users (no session), just reload the page
      if (!sessionId) {
        window.location.href = "/";
        return;
      }

      await clearSessionMutation.mutateAsync(sessionId);
      // Navigate to home to reset the chat interface
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to clear session:", error);
    }
  }, [clearSessionMutation, sessionId]);

  // Handle profile creation completion
  const handleProfileCreated = useCallback(
    (profile: UserProfile) => {
      setNewSyncKey(profile.syncKey);
      setShowProfileModal(false);
      setShowProfileCreated(true);

      // Complete the pending action after profile creation
      if (pendingAction === "favorites") {
        setFavoritesDialogOpen(true);
      } else if (pendingAction === "stats") {
        setStatsDialogOpen(true);
      } else if (pendingAction === "settings") {
        setSettingsDialogOpen(true);
      }

      setPendingAction(null);
    },
    [pendingAction]
  );

  // Handle clicks with profile requirement check
  const handleFavoritesClick = useCallback(() => {
    const profile = getUserProfile();
    if (!profile) {
      setPendingAction("favorites");
      setShowProfileModal(true);
      return;
    }
    setFavoritesDialogOpen(true);
  }, []);

  const handleStatsClick = useCallback(() => {
    const profile = getUserProfile();
    if (!profile) {
      setPendingAction("stats");
      setShowProfileModal(true);
      return;
    }
    setStatsDialogOpen(true);
  }, []);

  const handleSettingsClick = useCallback(() => {
    const profile = getUserProfile();
    if (!profile) {
      setPendingAction("settings");
      setShowProfileModal(true);
      return;
    }
    setSettingsDialogOpen(true);
  }, []);

  // React Query hook for favorites
  const { data: favorites = [] } = useFavorites();

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
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;

      const userMessage = input.trim();
      setInput("");

      // Let useChat handle adding the message - we'll save it in onFinish
      sendMessage(
        { text: userMessage },
        {
          body: {
            language: language,
            userDateTime: new Date().toISOString(),
            userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            units: units,
          },
        }
      );
      // Signal scroll to bottom within Conversation provider
      setScrollSignal((s) => s + 1);
    },
    [input, language, sendMessage, units]
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
            units: units,
          },
        }
      );
      // Signal scroll to bottom within Conversation provider
      setScrollSignal((s) => s + 1);
    },
    [language, sendMessage, units]
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
            units: units,
          },
        }
      );
    },
    [language, sendMessage, units]
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
    detailsOpen: detailsSheetOpen,
    selected: selectedConditions?.location ?? null,
    inputLen: input.length,
  });

  // (debug logging removed)

  return (
    <>
      <div className="flex flex-col h-dvh">
        <Header
          actions={
            <HeaderActions
              onSearchClick={() => setSearchDialogOpen(true)}
              onSettingsClick={handleSettingsClick}
              onFavoritesClick={handleFavoritesClick}
              onStatsClick={handleStatsClick}
              onAboutClick={() => setFeaturesDialogOpen(true)}
              onClearChatClick={() => setNewChatConfirmOpen(true)}
              isClearChatDisabled={messages.length === 0}
              extraActions={
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setFeaturesDialogOpen(true)}
                    className="rounded-full hidden md:flex"
                  >
                    <Info className="h-5 w-5" />
                    <span className="sr-only">{t("ui.aboutApp")}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setNewChatConfirmOpen(true)}
                    disabled={messages.length === 0}
                    className="rounded-full hidden md:flex"
                    title={t("chat.clearChatTooltip")}
                  >
                    <RotateCcw className="h-5 w-5" />
                    <span className="sr-only">{t("chat.clearChat")}</span>
                  </Button>
                </>
              }
            />
          }
        />

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

                  {/* Search hint - clickable */}
                  <button
                    onClick={() => setSearchDialogOpen(true)}
                    className="inline-flex items-center gap-2 mb-6 text-sm text-muted-foreground bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-800/30 rounded-lg px-3 py-2 hover:bg-orange-100/50 dark:hover:bg-orange-900/30 hover:border-orange-300/50 dark:hover:border-orange-700/50 transition-colors cursor-pointer"
                  >
                    <Search className="h-4 w-4 text-orange-600 dark:text-orange-500 shrink-0" />
                    <span>{t("welcome.searchHint")}</span>
                    {/* Show keyboard shortcut on desktop only */}
                    <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                      <span className="text-xs">{modifierKey === "Cmd" ? "⌘ + " : "Ctrl + "}K</span>
                    </kbd>
                  </button>

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

                  {/* Favorites Quick Actions */}
                  {favorites.length > 0 && (
                    <div className="mt-8 w-full max-w-lg">
                      <div className="flex items-center gap-2 justify-center mb-4">
                        <Star className="h-4 w-4 text-orange-500" />
                        <h3 className="text-sm font-medium text-muted-foreground">
                          {t("welcome.yourFavorites")}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {favorites.slice(0, 6).map((favorite) => (
                          <Button
                            key={favorite.id}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Use stored slug if available, otherwise generate one for backward compatibility
                              const slug =
                                favorite.areaSlug ||
                                generateUniqueSlug(
                                  favorite.areaName,
                                  favorite.latitude,
                                  favorite.longitude
                                );
                              router.push(`/location/${slug}`);
                            }}
                            className="transition-smooth hover:scale-105"
                          >
                            <Star className="h-3 w-3 mr-1.5 fill-orange-500 text-orange-500" />
                            {favorite.areaName}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                messages.map((message) => {
                  // Check if any tool is currently executing
                  const hasExecutingTool =
                    message.role === "assistant" &&
                    message.parts.some(
                      (part: any) =>
                        part.type.startsWith("tool-") &&
                        "state" in part &&
                        part.state !== "output-available"
                    );

                  // Check if message has any content to show
                  const hasContent = message.parts.some(
                    (part: any) =>
                      part.type === "text" || ("state" in part && part.state === "output-available")
                  );

                  // Prefer showing a single, most-recent assistant text summary above the card
                  // when a tool result is present. This ensures the summary likely reflects
                  // the latest tool output, even if the model emitted early generic text.
                  const isAssistant = message.role === "assistant";
                  const toolOutIdx = isAssistant
                    ? message.parts.findIndex(
                        (p: any) =>
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
                        {message.parts.map((part: any, i: number) => {
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
                                  setDetailsSheetOpen(true);
                                }}
                                onSheetClick={() => {
                                  setSelectedConditions(getMergedConditions());
                                  setDetailsSheetOpen(true);
                                }}
                                onFullDataFetched={handleFullDataFetched}
                                conditionsLabel={t("conditions.rating")}
                                detailsLabel={t("conditions.details")}
                                favoriteLabel={t("conditions.favorite")}
                                addReportLabel={t("conditions.addReport")}
                                viewCragPageLabel={t("conditions.viewCragPage")}
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
                        (part: any) =>
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
              <button
                onClick={() => setFeaturesDialogOpen(true)}
                className="hover:text-foreground transition-colors cursor-pointer"
              >
                {t("footer.about")}
              </button>
              <span>•</span>
              <button
                onClick={() => setPrivacyDialogOpen(true)}
                className="hover:text-foreground transition-colors cursor-pointer"
              >
                {t("footer.privacy")}
              </button>
              <span>•</span>
              <a
                href="https://github.com/rbatsenko/beta-rocks"
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

      {/* Conditions Detail Sheet */}
      {selectedConditions && (
        <ConditionsDetailSheet
          open={detailsSheetOpen}
          onOpenChange={setDetailsSheetOpen}
          data={selectedConditions}
        />
      )}

      {/* Search Dialog */}
      <SearchDialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen} />

      {/* Features / About App Dialog */}
      <FeaturesDialog open={featuresDialogOpen} onOpenChange={setFeaturesDialogOpen} />

      {/* Privacy Dialog */}
      <PrivacyDialog open={privacyDialogOpen} onOpenChange={setPrivacyDialogOpen} />

      {/* Settings Dialog */}
      <SettingsDialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen} />

      {/* Sync Explainer Dialog */}
      <SyncExplainerDialog
        open={syncExplainerDialogOpen}
        onOpenChange={setSyncExplainerDialogOpen}
        onOpenSettings={() => setSettingsDialogOpen(true)}
      />

      {/* Favorites Dialog */}
      <FavoritesDialog open={favoritesDialogOpen} onOpenChange={setFavoritesDialogOpen} />

      {/* Stats Dialog */}
      <StatsDialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen} />

      {/* Profile Creation Modal */}
      <ProfileCreationModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        trigger="manual"
        onCreated={handleProfileCreated}
      />

      {/* Profile Created Dialog */}
      <ProfileCreatedDialog
        open={showProfileCreated}
        onOpenChange={setShowProfileCreated}
        syncKey={newSyncKey}
        completedAction=""
      />

      {/* Clear Chat Confirmation Dialog */}
      <ConfirmDialog
        open={newChatConfirmOpen}
        onOpenChange={setNewChatConfirmOpen}
        onConfirm={() => {
          setNewChatConfirmOpen(false);
          handleNewChat();
        }}
        title={t("chat.clearChat")}
        description={t("chat.clearChatConfirm")}
        confirmText={t("chat.clearChat")}
        cancelText={t("dialog.cancel")}
        variant="destructive"
      />
    </>
  );
};

// Props passed from Server Component for SSR
interface ChatInterfaceProps {
  initialSyncKey?: string;
  initialDisplayName?: string;
  initialSessionId?: string;
}

// Main ChatInterface component that handles history loading with React Query
const ChatInterface = ({
  initialSyncKey: _initialSyncKey,
  initialDisplayName: _initialDisplayName,
  initialSessionId: _initialSessionId,
}: ChatInterfaceProps = {}) => {
  const { t, language } = useClientTranslation("common");
  const [featuresDialogOpen, setFeaturesDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [favoritesDialogOpen, setFavoritesDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [syncExplainerDialogOpen, setSyncExplainerDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  // Check if user has profile (for session management)
  const userProfile = typeof window !== "undefined" ? getUserProfile() : null;

  // React Query hooks for session and messages
  const { data: session, isLoading: isLoadingSession } = useCurrentSession();
  const { data: messages = [], isLoading: isLoadingMessages } = useChatMessages(session?.id);

  // Convert database messages to UIMessage format
  const initialMessages = useMemo(() => {
    return messages.map(chatMessageToUIMessage);
  }, [messages]);

  // Combined loading state
  const isLoadingHistory = isLoadingSession || isLoadingMessages;

  // Only mount ChatUI after history loads OR if user has no profile (anonymous users skip session loading)
  if (userProfile && (isLoadingHistory || !session)) {
    // Render the layout with a loader in the messages area (not full page)
    // Keep header and input visible during loading
    return (
      <div className="flex flex-col h-dvh">
        <Header
          actions={
            <HeaderActions
              onSearchClick={() => setSearchDialogOpen(true)}
              onSettingsClick={() => setSettingsDialogOpen(true)}
              onFavoritesClick={() => setFavoritesDialogOpen(true)}
              onStatsClick={() => setStatsDialogOpen(true)}
              onAboutClick={() => setFeaturesDialogOpen(true)}
              onClearChatClick={() => {}}
              isClearChatDisabled={true}
              extraActions={
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setFeaturesDialogOpen(true)}
                    className="rounded-full hidden md:flex"
                  >
                    <Info className="h-5 w-5" />
                    <span className="sr-only">{t("ui.aboutApp")}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled
                    className="rounded-full hidden md:flex"
                  >
                    <RotateCcw className="h-5 w-5" />
                    <span className="sr-only">{t("chat.clearChat")}</span>
                  </Button>
                </>
              }
            />
          }
        />
        <div className="flex-1 overflow-hidden flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>

        {/* Dialogs - render even during loading so buttons work */}
        <SearchDialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen} />
        <FeaturesDialog open={featuresDialogOpen} onOpenChange={setFeaturesDialogOpen} />
        <PrivacyDialog open={privacyDialogOpen} onOpenChange={setPrivacyDialogOpen} />
        <SettingsDialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen} />
        <FavoritesDialog open={favoritesDialogOpen} onOpenChange={setFavoritesDialogOpen} />
        <StatsDialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen} />
        <SyncExplainerDialog
          open={syncExplainerDialogOpen}
          onOpenChange={setSyncExplainerDialogOpen}
          onOpenSettings={() => setSettingsDialogOpen(true)}
        />
        {/* Input bar - visible during loading but disabled */}
        <div className="border-t bg-background">
          <div className="container max-w-3xl px-4 py-4">
            <form className="flex gap-2">
              <Input placeholder={t("chat.inputPlaceholder")} className="flex-1" disabled />
              <Button type="submit" size="icon" disabled>
                <Send className="w-4 h-4" />
              </Button>
            </form>
            {/* Footer Links */}
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
              <button
                onClick={() => setFeaturesDialogOpen(true)}
                className="hover:text-foreground transition-colors cursor-pointer"
              >
                {t("footer.about")}
              </button>
              <span>•</span>
              <button
                onClick={() => setPrivacyDialogOpen(true)}
                className="hover:text-foreground transition-colors cursor-pointer"
              >
                {t("footer.privacy")}
              </button>
              <span>•</span>
              <a
                href="https://github.com/rbatsenko/beta-rocks"
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
    );
  }

  // Once loaded, render the full chat UI
  // For anonymous users, session will be undefined - that's OK, chat will work without persistence
  return (
    <ChatUI sessionId={session?.id} initialMessages={initialMessages} t={t} language={language} />
  );
};

export default ChatInterface;
