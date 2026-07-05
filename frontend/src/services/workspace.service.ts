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

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const workspaceService = {
  async getWorkspaces(): Promise<Workspace[]> {
    const { data: res } = await api.get<ApiResponse<Workspace[]>>('/workspaces');
    return res.data;
  },

  async createWorkspace(
    title: string,
    repoId?: string,
    repositoryUrl?: string,
  ): Promise<Workspace> {
    const payload: CreateWorkspacePayload = { title };
    if (repoId) payload.repositoryId = repoId;
    if (repositoryUrl) payload.repositoryUrl = repositoryUrl;
    const { data: res } = await api.post<ApiResponse<Workspace>>('/workspaces', payload);
    return res.data;
  },

  async getWorkspace(id: string): Promise<Workspace> {
    const { data: res } = await api.get<ApiResponse<Workspace>>(`/workspaces/${id}`);
    return res.data;
  },

  async updateWorkspace(
    id: string,
    patch: {
      title?: string;
      repositoryId?: string;
      repositoryUrl?: string;
    },
  ): Promise<Workspace> {
    const { data: res } = await api.patch<ApiResponse<Workspace>>(`/workspaces/${id}`, patch);
    return res.data;
  },

  async deleteWorkspace(id: string): Promise<void> {
    await api.delete(`/workspaces/${id}`);
  },
};

export default workspaceService;
