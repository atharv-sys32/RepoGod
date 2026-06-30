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
  streamChat(params: ChatStreamParams, handlers: Omit<ChatStreamHandlers, 'close'>): ChatStreamHandlers {
    const token = localStorage.getItem('rg_token');
    const searchParams = new URLSearchParams({
      workspaceId: params.workspaceId,
      prompt: params.prompt,
    });
    if (params.repositoryId) searchParams.set('repositoryId', params.repositoryId);
    if (params.conversationId) searchParams.set('conversationId', params.conversationId);
    if (token) searchParams.set('token', token);

    const url = `/api/v1/chat/stream?${searchParams.toString()}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as SSEEvent;
        handlers.onEvent?.(parsed);

        switch (parsed.type) {
          case 'content_delta': {
            const delta = parsed.data as ContentDeltaData;
            handlers.onMessage?.(delta.text);
            break;
          }
          case 'planner_step': {
            const step = parsed.data as PlannerStepData;
            handlers.onPlannerStep?.(step);
            break;
          }
          case 'error': {
            handlers.onError?.(String(parsed.data));
            eventSource.close();
            break;
          }
          case 'done':
          case 'message_stop': {
            handlers.onDone?.();
            eventSource.close();
            break;
          }
        }
      } catch {
        handlers.onError?.('Failed to parse SSE event');
      }
    };

    eventSource.onerror = () => {
      handlers.onError?.('Connection error');
      eventSource.close();
    };

    return {
      ...handlers,
      close: () => eventSource.close(),
    };
  },
};

export default chatService;
