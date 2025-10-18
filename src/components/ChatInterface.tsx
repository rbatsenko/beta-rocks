"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Sun, Info, CloudSun } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { ConditionsDetailDialog } from "@/components/ConditionsDetailDialog";

interface ConditionsData {
  location: string;
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
}

interface DisambiguationResult {
  disambiguate: true;
  message: string;
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
  const [input, setInput] = useState("");
  const { messages, sendMessage } = useChat();
  const isLoading = messages.length > 0 && messages[messages.length - 1].role === "user";
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedConditions, setSelectedConditions] = useState<ConditionsData | null>(null);

  const exampleQueries = [
    "Siurana conditions tomorrow?",
    "Is El Pati dry this afternoon?",
    "Best sectors at Fontainebleau today?",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    sendMessage({ text: userMessage });
  };

  const handleExampleClick = (query: string) => {
    setInput("");
    sendMessage({ text: query });
  };

  return (
    <>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container flex h-16 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <CloudSun className="w-6 h-6 text-orange-500" />
              <h1 className="text-xl font-bold">temps.rocks</h1>
            </Link>
            <ThemeToggle />
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
                  <h2 className="text-3xl font-bold mb-3">Ask about climbing conditions</h2>
                  <p className="text-muted-foreground mb-8 max-w-md text-base">
                    Get real-time weather, friction analysis, and optimal climbing windows for any crag worldwide
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                    {exampleQueries.map((query, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => handleExampleClick(query)}
                        className="transition-smooth hover:scale-105"
                      >
                        {query}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  // Check if any tool is currently executing
                  const hasExecutingTool = message.role === "assistant" && message.parts.some(
                    (part) => part.type.startsWith("tool-") && part.state !== "output-available"
                  );

                  // Check if message has any content to show
                  const hasContent = message.parts.some(
                    (part) => part.type === "text" || part.state === "output-available"
                  );

                  return (
                    <Message key={message.id} from={message.role}>
                      <MessageContent variant={message.role === "assistant" ? "flat" : "contained"}>
                        {hasExecutingTool && !hasContent && (
                          <div className="flex items-center gap-3 py-1">
                            <div className="flex gap-1.5">
                              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                            </div>
                            <span className="text-sm text-muted-foreground">Analyzing conditions...</span>
                          </div>
                        )}
                        {message.parts.map((part, i) => {
                          // Render text parts
                          if (part.type === "text") {
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
                              return (
                                <div key={i} className="mt-3 space-y-2">
                                  <p className="text-sm font-medium">{result.message}</p>
                                  <div className="flex flex-wrap gap-2 overflow-visible">
                                    {result.options.map((option, idx) => (
                                      <Button
                                        key={option.id}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const rockTypePart = option.rockType ? ` ${option.rockType}` : "";
                                          sendMessage({
                                            text: `conditions at ${option.name}${rockTypePart} (${option.latitude}, ${option.longitude})`,
                                          });
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
                                className="mt-3 bg-muted/50 rounded-lg p-4 space-y-3 border border-border"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="space-y-2 flex-1">
                                    <div className="font-semibold text-base">
                                      🧗 {conditionsResult.location}
                                    </div>
                                    <div className="font-medium">
                                      Rating: {conditionsResult.rating} ({conditionsResult.frictionScore}
                                      /5)
                                    </div>
                                    {conditionsResult.warnings && conditionsResult.warnings.length > 0 && (
                                      <div className="text-destructive font-semibold text-sm">
                                        ⚠️ {conditionsResult.warnings.join(", ")}
                                      </div>
                                    )}
                                    {conditionsResult.reasons && conditionsResult.reasons.length > 0 && (
                                      <div className="text-sm opacity-80">
                                        {conditionsResult.reasons.join(", ")}
                                      </div>
                                    )}
                                  </div>
                                  {(conditionsResult.hourlyConditions ||
                                    conditionsResult.optimalWindows) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="ml-3 shrink-0"
                                      onClick={() => {
                                        setSelectedConditions(conditionsResult);
                                        setDetailsDialogOpen(true);
                                      }}
                                    >
                                      <Info className="w-4 h-4 mr-1" />
                                      Details
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
                        <div className="size-8 rounded-full bg-orange-500/10 flex items-center justify-center">
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
                    <span>Thinking...</span>
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
                placeholder="Ask about any crag, sector, or route..."
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
                About
              </a>
              <span>•</span>
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy
              </a>
              <span>•</span>
              <a
                href="https://github.com/rbatsenko/temps-rocks"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
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
