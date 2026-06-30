import api from './api';

export interface Conversation {
  id: string;
  workspaceId: string;
  title?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SendMessagePayload {
  content: string;
  conversationId?: string;
}

export interface SendMessageResponse {
  conversationId: string;
  messageId: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const conversationService = {
  async getConversations(workspaceId: string): Promise<Conversation[]> {
    const { data: res } = await api.get<ApiResponse<Conversation[]>>(
      `/workspaces/${workspaceId}/conversations`,
    );
    return res.data;
  },

  async getConversation(conversationId: string): Promise<Conversation> {
    const { data: res } = await api.get<ApiResponse<Conversation>>(
      `/conversations/${conversationId}`,
    );
    return res.data;
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const { data: res } = await api.get<ApiResponse<Message[]>>(
      `/conversations/${conversationId}/messages`,
    );
    return res.data;
  },

  async sendMessage(
    workspaceId: string,
    content: string,
    conversationId?: string,
  ): Promise<SendMessageResponse> {
    const payload: SendMessagePayload = { content };
    if (conversationId) payload.conversationId = conversationId;
    const { data: res } = await api.post<ApiResponse<SendMessageResponse>>(
      `/workspaces/${workspaceId}/messages`,
      payload,
    );
    return res.data;
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await api.delete(`/conversations/${conversationId}`);
  },
};

export default conversationService;
