import api from './api';

export type IndexingStatus =
  | 'pending'
  | 'cloning'
  | 'parsing'
  | 'embedding'
  | 'indexed'
  | 'error';

export interface Repository {
  id: string;
  name: string;
  gitUrl: string;
  language?: string;
  description?: string;
  defaultBranch?: string;
  status: IndexingStatus;
  indexedAt?: string;
  errorMessage?: string;
  fileCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  language?: string;
  children?: FileNode[];
}

export interface FileContent {
  path: string;
  content: string;
  language?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const repositoryService = {
  async importRepository(gitUrl: string, name?: string): Promise<Repository> {
    const { data: res } = await api.post<ApiResponse<Repository>>('/repositories/import', {
      gitUrl,
      name,
    });
    return res.data;
  },

  async getRepositories(): Promise<Repository[]> {
    const { data: res } = await api.get<ApiResponse<Repository[]>>('/repositories');
    return res.data;
  },

  async getRepository(id: string): Promise<Repository> {
    const { data: res } = await api.get<ApiResponse<Repository>>(`/repositories/${id}`);
    return res.data;
  },

  async getStatus(id: string): Promise<{ status: IndexingStatus; progress?: number }> {
    const { data: res } = await api.get<ApiResponse<{ status: IndexingStatus; progress?: number }>>(
      `/repositories/${id}/status`,
    );
    return res.data;
  },

  async triggerIndex(id: string): Promise<{ message: string }> {
    const { data: res } = await api.post<ApiResponse<{ message: string }>>(
      `/repositories/${id}/index`,
    );
    return res.data;
  },

  async getFileTree(id: string): Promise<FileNode[]> {
    const { data: res } = await api.get<ApiResponse<FileNode[]>>(`/repositories/${id}/tree`);
    return res.data;
  },

  async getFileContent(id: string, filePath: string): Promise<FileContent> {
    const { data: res } = await api.get<ApiResponse<FileContent>>(
      `/repositories/${id}/file?path=${encodeURIComponent(filePath)}`,
    );
    return res.data;
  },

  async deleteRepository(id: string): Promise<void> {
    await api.delete(`/repositories/${id}`);
  },
};

export default repositoryService;
