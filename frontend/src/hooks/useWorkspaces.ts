import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import workspaceService from '@/services/workspace.service';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useEffect } from 'react';

export function useWorkspaces() {
  const { setWorkspaces } = useWorkspaceStore();

  const query = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspaceService.getWorkspaces(),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (query.data) {
      setWorkspaces(query.data);
    }
  }, [query.data, setWorkspaces]);

  return query;
}

export function useWorkspace(id: string) {
  return useQuery({
    queryKey: ['workspace', id],
    queryFn: () => workspaceService.getWorkspace(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  const { addWorkspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: ({
      title,
      repoId,
      repositoryUrl,
    }: {
      title: string;
      repoId?: string;
      repositoryUrl?: string;
    }) => workspaceService.createWorkspace(title, repoId, repositoryUrl),
    onSuccess: (workspace) => {
      addWorkspace(workspace);
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  const { removeWorkspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: (id: string) => workspaceService.deleteWorkspace(id),
    onSuccess: (_data, id) => {
      removeWorkspace(id);
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
