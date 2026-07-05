export type SSEEventType =
  | 'message_start'
  | 'content_delta'
  | 'message_stop'
  | 'planner_step'
  | 'tool_start'
  | 'tool_end'
  | 'error'
  | 'done';

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
}

export interface ContentDeltaData {
  text: string;
}

export interface PlannerStepData {
  stepId: string;
  toolName: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  input?: Record<string, unknown>;
  output?: string;
  durationMs?: number;
}

export interface ChatStreamHandlers {
  onEvent?: (event: SSEEvent) => void;
  onMessage?: (text: string) => void;
  onPlannerStep?: (step: PlannerStepData) => void;
  onError?: (error: string) => void;
  onDone?: () => void;
  close: () => void;
}

export interface ChatStreamParams {
  workspaceId: string;
  repositoryId?: string;
  prompt: string;
  conversationId?: string;
}

const chatService = {
  async streamChat(params: ChatStreamParams, handlers: Omit<ChatStreamHandlers, 'close'>): Promise<ChatStreamHandlers> {
    const token = localStorage.getItem('rg_token');
    const searchParams = new URLSearchParams({
      workspaceId: params.workspaceId,
      content: params.prompt,
    });
    if (params.repositoryId) searchParams.set('repositoryId', params.repositoryId);
    if (params.conversationId) searchParams.set('conversationId', params.conversationId);

    const url = `/api/v1/chat/stream?${searchParams.toString()}`;
    const abortController = new AbortController();

    try {
      const response = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'text/event-stream',
        },
        signal: abortController.signal,
      });

      if (!response.ok) {
        handlers.onError?.(`Connection error: ${response.status}`);
        return { ...handlers, close: () => abortController.abort() };
      }

      const reader = response.body?.getReader();
      if (!reader) {
        handlers.onError?.('Response body not available');
        return { ...handlers, close: () => abortController.abort() };
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = 'message';
      let finished = false;

      const read = () => {
        if (finished) return;
        reader.read().then(({ done, value }) => {
          if (done) return;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              const dataStr = line.slice(5).trim();
              if (dataStr === '[DONE]') {
                handlers.onDone?.();
                finished = true;
                return;
              }
              if (!dataStr) continue;

              switch (currentEvent) {
                case 'metadata':
                  try {
                    const meta = JSON.parse(dataStr);
                    handlers.onEvent?.({ type: 'message_start', data: meta });
                  } catch { /* skip */ }
                  break;
                case 'chunk':
                  // Chunk data is JSON {"text": "..."} to avoid SSE newline issues
                  try {
                    const chunkData = JSON.parse(dataStr);
                    if (chunkData.text) {
                      handlers.onMessage?.(chunkData.text);
                    }
                  } catch {
                    handlers.onMessage?.(dataStr);
                  }
                  break;
                case 'error':
                  handlers.onError?.(dataStr);
                  abortController.abort();
                  return;
                case 'done':
                case 'message_stop':
                  handlers.onDone?.();
                  return;
                default:
                  // Fallback: parse as JSON SSEEvent
                  try {
                    const parsed = JSON.parse(dataStr) as SSEEvent;
                    handlers.onEvent?.(parsed);
                    if (parsed.type === 'content_delta') {
                      const text = (parsed.data as ContentDeltaData)?.text ?? '';
                      if (text) handlers.onMessage?.(text);
                    } else if (parsed.type === 'planner_step') {
                      handlers.onPlannerStep?.(parsed.data as PlannerStepData);
                    } else if (parsed.type === 'done' || parsed.type === 'message_stop') {
                      handlers.onDone?.();
                      return;
                    } else if (parsed.type === 'error') {
                      handlers.onError?.(String(parsed.data));
                      abortController.abort();
                      return;
                    }
                  } catch { /* skip */ }
                  break;
              }
              currentEvent = 'message';
            }
          }

          read();
        }).catch((err) => {
          if (!finished && err.name !== 'AbortError') {
            handlers.onError?.('Connection error');
          }
        });
      };

      read();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        handlers.onError?.('Connection error');
      }
    }

    return {
      ...handlers,
      close: () => abortController.abort(),
    };
  },
};

export default chatService;
