import api from './api';

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
    createdAt: string;
  };
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
}

const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    } satisfies LoginPayload);
    return data;
  },

  async register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', {
      email,
      password,
      displayName,
    } satisfies RegisterPayload);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore errors — always clear local state
    } finally {
      localStorage.removeItem('rg_token');
      localStorage.removeItem('rg_user');
    }
  },

  async me(): Promise<AuthResponse['user']> {
    const { data } = await api.get<AuthResponse['user']>('/auth/me');
    return data;
  },
};

export default authService;
