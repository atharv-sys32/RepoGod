import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import conversationService from '@/services/conversation.service';

export function useConversations(workspaceId: string) {
  return useQuery({
    queryKey: ['conversations', workspaceId],
    queryFn: () => conversationService.getConversations(workspaceId),
    enabled: !!workspaceId,
    staleTime: 15_000,
  });
}

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => conversationService.getMessages(conversationId!),
    enabled: !!conversationId,
    staleTime: 0,
  });
}

export function useSendMessage(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      content,
      conversationId,
    }: {
      content: string;
      conversationId?: string;
    }) => conversationService.sendMessage(workspaceId, content, conversationId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['messages', data.conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['conversations', workspaceId],
      });
    },
  });
}

export function useDeleteConversation(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      conversationService.deleteConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', workspaceId] });
    },
  });
}
