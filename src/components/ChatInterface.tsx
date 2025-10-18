"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Loader2, Sun } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";

const ChatInterface = () => {
  const [input, setInput] = useState("");
  const { messages, sendMessage } = useChat();
  const isLoading = messages.length > 0 && messages[messages.length - 1].role === "user";

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
  }

  return (
    <section id="chat-section" className="py-20 px-6 bg-gradient-earth">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div className="text-center flex-1">
            <h2 className="text-4xl font-bold mb-4">Ask About Conditions</h2>
            <p className="text-lg text-muted-foreground">
              Chat naturally about any crag, sector, or route worldwide
            </p>
          </div>
          <ThemeToggle />
        </div>

        <Card className="shadow-elevated h-[600px] flex flex-col">
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
                const textParts = message.parts.filter((part: any) => part.type === "text");
                const toolParts = message.parts.filter((part: any) => part.type !== "text" && part.type !== "error");

                // Debug: log parts to see what we're getting
                if (message.role === "assistant") {
                  console.log('Message parts:', message.parts);
                  console.log('Tool parts:', toolParts);
                }

                return (
                  <Message key={message.id} from={message.role}>
                    <MessageContent variant={message.role === "assistant" ? "flat" : "contained"}>
                      {/* Render text parts with markdown */}
                      {textParts.map((part: any, i: number) => (
                        <Response key={i}>{part.text}</Response>
                      ))}

                      {/* Render tool results inline for assistant messages */}
                      {message.role === "assistant" && toolParts.map((part: any, i: number) => {
                        console.log('Processing tool part:', part.type, part);

                        // In AI SDK v5, tool parts have type 'tool-${toolName}'
                        if (part.type === "tool-get_conditions" || (part.type.startsWith?.('tool-') && part.toolName === "get_conditions")) {
                          // Handle disambiguation results
                          if (part.output?.disambiguate || part.result?.disambiguate) {
                            const result = part.output || part.result;
                            return (
                              <div key={i} className="mt-3 space-y-2">
                                <p className="text-sm font-medium">{result.message}</p>
                                <div className="flex flex-wrap gap-2">
                                  {result.options?.map((option: any) => (
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
                          const result = part.output || part.result;
                          return (
                            <div key={i} className="mt-3 bg-muted/50 rounded-lg p-4 space-y-2 border border-border">
                              <div className="font-semibold text-base">🧗 {result?.location}</div>
                              <div className="font-medium">Rating: {result?.rating} ({result?.frictionScore}/5)</div>
                              {result?.warnings && result.warnings.length > 0 && (
                                <div className="text-destructive font-semibold text-sm">
                                  ⚠️ {result.warnings.join(", ")}
                                </div>
                              )}
                              {result?.reasons && result.reasons.length > 0 && (
                                <div className="text-sm opacity-80">{result.reasons.join(", ")}</div>
                              )}
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
    </section>
  );
};

export default ChatInterface;
