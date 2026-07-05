import { useState, useCallback, useRef, useEffect } from 'react';
import chatService, { type PlannerStepData } from '@/services/chat.service';
import conversationService from '@/services/conversation.service';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UseChatStreamOptions {
  workspaceId: string;
  repositoryId?: string;
  conversationId?: string;
  onConversationCreated?: (id: string) => void;
}

export function useChatStream({
  workspaceId,
  repositoryId,
  conversationId: initialConversationId,
  onConversationCreated,
}: UseChatStreamOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [plannerEvents, setPlannerEvents] = useState<PlannerStepData[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | undefined>(initialConversationId);
  const streamRef = useRef<{ close: () => void } | null>(null);

  // Load past messages when an existing conversation ID is provided
  useEffect(() => {
    if (initialConversationId) {
      conversationIdRef.current = initialConversationId;
      conversationService.getMessages(initialConversationId).then((msgs) => {
        const loaded: ChatMessage[] = msgs.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.createdAt),
        }));
        setMessages(loaded);
      }).catch(() => {
        // conversation might not exist yet, that's ok
      });
    }
  }, [initialConversationId]);

  const sendMessage = useCallback(
    async (prompt: string) => {
      if (isStreaming) return;

      // Add user message immediately
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: prompt,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Create assistant placeholder
      const assistantId = `assistant-${Date.now()}`;
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsStreaming(true);
      setError(null);

      const stream = await chatService.streamChat(
        {
          workspaceId,
          repositoryId,
          prompt,
          conversationId: conversationIdRef.current,
        },
        {
          onEvent: (event) => {
            if (
              event.type === 'message_start' &&
              typeof event.data === 'object' &&
              event.data !== null &&
              'conversationId' in event.data
            ) {
              const newId = (event.data as { conversationId: string }).conversationId;
              if (!conversationIdRef.current) {
                conversationIdRef.current = newId;
                onConversationCreated?.(newId);
              }
            }
          },
          onMessage: (text) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + text } : m,
              ),
            );
          },
          onPlannerStep: (step) => {
            setPlannerEvents((prev) => {
              const idx = prev.findIndex((s) => s.stepId === step.stepId);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = step;
                return next;
              }
              return [...prev, step];
            });
          },
          onError: (err) => {
            setError(err);
            setIsStreaming(false);
          },
          onDone: () => {
            setIsStreaming(false);
          },
        },
      );

      streamRef.current = stream;
    },
    [isStreaming, workspaceId, repositoryId, onConversationCreated],
  );

  const cancelStream = useCallback(() => {
    streamRef.current?.close();
    setIsStreaming(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setPlannerEvents([]);
    conversationIdRef.current = undefined;
  }, []);

  return {
    messages,
    plannerEvents,
    isStreaming,
    error,
    sendMessage,
    cancelStream,
    clearMessages,
    conversationId: conversationIdRef.current,
  };
}
