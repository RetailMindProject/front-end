import { useState, useCallback } from "react";
import { customerApi } from "../services/customer.api";
import type { DataSource } from "../types/customer.api";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  dataSource?: DataSource | null;
  conversationId?: string | null;
  timestamp: Date;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  const sendMessage = useCallback(async (message: string, options?: {
    projectId?: string;
    conversationId?: string;
    language?: string;
    channel?: string;
    metadata?: Record<string, unknown>;
  }) => {
    if (!message.trim()) return;
    
    // Check rate limit
    if (isRateLimited) {
      setError(`Please wait ${rateLimitCountdown} seconds before sending another message.`);
      return;
    }

    // Add user message immediately (optimistic UI)
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: message.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      const result = await customerApi.askChat({
        message: message.trim(),
        ...(options?.projectId && { projectId: options.projectId }),
        ...(options?.conversationId && { conversationId: options.conversationId }),
        ...(options?.language && { language: options.language }),
        ...(options?.channel && { channel: options.channel }),
        ...(options?.metadata && { metadata: options.metadata }),
      });

      if (result.data) {
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: result.data.answer,
          dataSource: result.data.dataSource,
          conversationId: result.data.conversationId,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else if (result.error) {
        setError(result.error);
        
        // Handle authentication errors (401/403) - should trigger logout
        if (result.status === 401 || result.status === 403) {
          // Error message already set, component should handle logout
          const errorMessage: ChatMessage = {
            id: `error-${Date.now()}`,
            role: "assistant",
            text: result.error,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          return; // Don't continue processing
        }
        
        // Handle rate limiting (429)
        if (result.status === 429) {
          setIsRateLimited(true);
          setRateLimitCountdown(5);
          
          // Countdown timer
          const interval = setInterval(() => {
            setRateLimitCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                setIsRateLimited(false);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
        
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          text: result.error,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send message";
      setError(errorMessage);
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        text: "Assistant is currently unavailable. Please try again later.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [isRateLimited, rateLimitCountdown]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setIsRateLimited(false);
    setRateLimitCountdown(0);
  }, []);

  return {
    messages,
    loading,
    error,
    isRateLimited,
    rateLimitCountdown,
    sendMessage,
    clearMessages,
  };
}

