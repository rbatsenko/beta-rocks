/**
 * Chat screen - main screen of the app
 * AI-powered climbing conditions chat (like the web app)
 */

import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sendChatMessage } from "@/api/client";
import type { ChatMessage } from "@/types/api";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await sendChatMessage(apiMessages);
      const responseText = await response.text();

      // Parse the streamed response (simplified - in production use proper AI SDK streaming)
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseText || "Sorry, I couldn't process that request.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Sorry, something went wrong. Please check your connection and try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[
          styles.messageBubble,
          isUser
            ? [styles.userBubble, { backgroundColor: colors.primary }]
            : [styles.assistantBubble, { backgroundColor: colors.surface }],
        ]}
      >
        <Text
          style={[
            styles.messageText,
            {
              color: isUser ? colors.primaryForeground : colors.text,
            },
          ]}
        >
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            beta.rocks
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Ask about climbing conditions at any crag worldwide
          </Text>
          <View style={styles.suggestions}>
            {[
              "What are conditions at Fontainebleau?",
              "Is it good to climb at El Cap today?",
              "Best time to climb at Kalymnos this week?",
            ].map((suggestion) => (
              <TouchableOpacity
                key={suggestion}
                style={[
                  styles.suggestionChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => setInput(suggestion)}
              >
                <Text style={[styles.suggestionText, { color: colors.text }]}>
                  {suggestion}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about any crag..."
          placeholderTextColor={colors.muted}
          multiline
          maxLength={500}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor:
                input.trim() && !isLoading
                  ? colors.primary
                  : colors.muted,
            },
          ]}
          onPress={handleSend}
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Ionicons
              name="arrow-up"
              size={20}
              color={colors.primaryForeground}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  suggestions: {
    width: "100%",
    gap: Spacing.sm,
  },
  suggestionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: FontSize.sm,
  },
  messagesList: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    marginVertical: Spacing.xs,
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: BorderRadius.sm,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: BorderRadius.sm,
  },
  messageText: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    borderWidth: 1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
});
