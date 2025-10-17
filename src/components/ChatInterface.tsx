import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const exampleQueries = [
    "Siurana conditions tomorrow?",
    "Is El Pati dry this afternoon?",
    "Best sectors at Fontainebleau today?",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // TODO: Implement actual chat endpoint
      // For now, mock response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Thanks for asking! I'm still learning about climbing conditions. Check back soon for real-time weather data, community reports, and route-specific conditions." 
      }]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (query: string) => {
    setInput(query);
  };

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

        <Card className="shadow-elevated">
          {/* Messages */}
          <div className="p-6 min-h-[400px] max-h-[600px] overflow-y-auto space-y-4">
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
              messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-4">
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
