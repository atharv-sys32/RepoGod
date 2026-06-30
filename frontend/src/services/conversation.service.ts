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

const conversationService = {
  async getConversations(workspaceId: string): Promise<Conversation[]> {
    const { data } = await api.get<Conversation[]>(
      `/workspaces/${workspaceId}/conversations`,
    );
    return data;
  },

  async getConversation(conversationId: string): Promise<Conversation> {
    const { data } = await api.get<Conversation>(
      `/conversations/${conversationId}`,
    );
    return data;
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const { data } = await api.get<Message[]>(
      `/conversations/${conversationId}/messages`,
    );
    return data;
  },

  async sendMessage(
    workspaceId: string,
    content: string,
    conversationId?: string,
  ): Promise<SendMessageResponse> {
    const payload: SendMessagePayload = { content };
    if (conversationId) payload.conversationId = conversationId;
    const { data } = await api.post<SendMessageResponse>(
      `/workspaces/${workspaceId}/messages`,
      payload,
    );
    return data;
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await api.delete(`/conversations/${conversationId}`);
  },
};

export default conversationService;
