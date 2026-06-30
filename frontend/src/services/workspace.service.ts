import api from './api';

export interface Workspace {
  id: string;
  title: string;
  repositoryId?: string;
  repositoryName?: string;
  repositoryUrl?: string;
  lastOpenedAt: string;
  createdAt: string;
  updatedAt: string;
  indexingStatus?: 'pending' | 'indexing' | 'indexed' | 'error';
}

export interface CreateWorkspacePayload {
  title: string;
  repositoryId?: string;
  repositoryUrl?: string;
}

const workspaceService = {
  async getWorkspaces(): Promise<Workspace[]> {
    const { data } = await api.get<Workspace[]>('/workspaces');
    return data;
  },

  async createWorkspace(
    title: string,
    repoId?: string,
    repositoryUrl?: string,
  ): Promise<Workspace> {
    const payload: CreateWorkspacePayload = { title };
    if (repoId) payload.repositoryId = repoId;
    if (repositoryUrl) payload.repositoryUrl = repositoryUrl;
    const { data } = await api.post<Workspace>('/workspaces', payload);
    return data;
  },

  async getWorkspace(id: string): Promise<Workspace> {
    const { data } = await api.get<Workspace>(`/workspaces/${id}`);
    return data;
  },

  async updateWorkspace(
    id: string,
    patch: Partial<Pick<Workspace, 'title'>>,
  ): Promise<Workspace> {
    const { data } = await api.patch<Workspace>(`/workspaces/${id}`, patch);
    return data;
  },

  async deleteWorkspace(id: string): Promise<void> {
    await api.delete(`/workspaces/${id}`);
  },
};

export default workspaceService;
