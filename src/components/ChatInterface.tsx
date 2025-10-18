"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
  options: Array<{
    id: string;
    name: string;
    location: string;
    latitude: number;
    longitude: number;
  }>;
}

const ChatInterface = () => {
  const [input, setInput] = useState("");
  const { messages, sendMessage } = useChat({
    experimental_throttle: 100, // Batch updates every 100ms for smooth streaming
  });
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
    <section id="chat-section" className="py-12 px-6 bg-gradient-earth">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <CloudSun className="w-10 h-10 text-orange-500" />
            <h1 className="text-3xl font-bold">temps.rocks</h1>
          </div>
          <ThemeToggle />
        </div>
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Ask About Conditions</h2>
          <p className="text-lg text-muted-foreground">
            Chat naturally about any crag, sector, or route worldwide
          </p>
        </div>

        <Card className="shadow-elevated h-[50vh] md:h-[400px] flex flex-col">
          <Conversation className="flex-1">
            <ConversationContent className="p-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Send className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Start a conversation</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Ask about climbing conditions anywhere in the world
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
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
                  return (
                    <Message key={message.id} from={message.role}>
                      <MessageContent variant={message.role === "assistant" ? "flat" : "contained"}>
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
                                  <div className="flex flex-wrap gap-2">
                                    {result.options.map((option) => (
                                      <Button
                                        key={option.id}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          sendMessage({
                                            text: `conditions at ${option.name} (${option.latitude}, ${option.longitude})`,
                                          });
                                        }}
                                        className="flex flex-col items-start h-auto py-2 px-3"
                                      >
                                        <span className="font-semibold text-sm">{option.name}</span>
                                        <span className="text-xs opacity-70">{option.location}</span>
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

          {/* Input */}
          <div className="border-t p-4 shrink-0">
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
          </div>
        </Card>
      </div>

      {/* Conditions Detail Dialog */}
      {selectedConditions && (
        <ConditionsDetailDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          data={selectedConditions}
        />
      )}
    </section>
  );
};

export default ChatInterface;
