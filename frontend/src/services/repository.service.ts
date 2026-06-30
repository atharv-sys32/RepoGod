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

const repositoryService = {
  async importRepository(gitUrl: string, name?: string): Promise<Repository> {
    const { data } = await api.post<Repository>('/repositories/import', {
      gitUrl,
      name,
    });
    return data;
  },

  async getRepositories(): Promise<Repository[]> {
    const { data } = await api.get<Repository[]>('/repositories');
    return data;
  },

  async getRepository(id: string): Promise<Repository> {
    const { data } = await api.get<Repository>(`/repositories/${id}`);
    return data;
  },

  async getStatus(id: string): Promise<{ status: IndexingStatus; progress?: number }> {
    const { data } = await api.get<{ status: IndexingStatus; progress?: number }>(
      `/repositories/${id}/status`,
    );
    return data;
  },

  async triggerIndex(id: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>(
      `/repositories/${id}/index`,
    );
    return data;
  },

  async getFileTree(id: string): Promise<FileNode[]> {
    const { data } = await api.get<FileNode[]>(`/repositories/${id}/tree`);
    return data;
  },

  async getFileContent(id: string, filePath: string): Promise<FileContent> {
    const { data } = await api.get<FileContent>(
      `/repositories/${id}/file?path=${encodeURIComponent(filePath)}`,
    );
    return data;
  },

  async deleteRepository(id: string): Promise<void> {
    await api.delete(`/repositories/${id}`);
  },
};

export default repositoryService;
