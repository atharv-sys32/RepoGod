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

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const msgs = await conversationService.getMessages(convId);
      const loaded: ChatMessage[] = msgs.map((m) => {
        let content = m.content;
        // Clean up old messages that stored raw SSE JSON instead of just text
        if (content.includes('{"event_type":') || content.includes('{"eventtype":')) {
          const marker = '{"text":';
          const idx = content.lastIndexOf(marker);
          if (idx >= 0) {
            const after = content.slice(idx + marker.length).trim();
            if (after[0] === '"') {
              for (let i = 1; i < after.length; i++) {
                if (after[i] === '"' && after[i - 1] !== '\\') {
                  content = after.slice(1, i)
                    .replace(/\\n/g, '\n')
                    .replace(/\\"/g, '"')
                    .replace(/\\\\/g, '\\');
                  break;
                }
              }
            }
          } else {
            content = '[Response could not be parsed]';
          }
        }
        return {
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content,
          timestamp: new Date(m.createdAt),
        };
      });
      setMessages(loaded);
    } catch {
      // conversation might not exist yet, that's ok
    }
  }, []);

  // Load messages when navigating to a specific conversation via URL.
  // Don't clear messages during streaming (onConversationCreated updates URL mid-stream).
  useEffect(() => {
    if (initialConversationId && !isStreaming) {
      conversationIdRef.current = initialConversationId;
      setMessages([]);
      setPlannerEvents([]);
      loadMessages(initialConversationId);
    } else if (!initialConversationId && !isStreaming) {
      conversationIdRef.current = undefined;
      setMessages([]);
      setPlannerEvents([]);
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

  const switchConversation = useCallback(async (convId: string) => {
    conversationIdRef.current = convId;
    setMessages([]);
    setPlannerEvents([]);
    await loadMessages(convId);
  }, [loadMessages]);

  return {
    messages,
    plannerEvents,
    isStreaming,
    error,
    sendMessage,
    cancelStream,
    clearMessages,
    switchConversation,
    conversationId: conversationIdRef.current,
  };
}
