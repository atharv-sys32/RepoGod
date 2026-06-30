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

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data: res } = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
      email,
      password,
    } satisfies LoginPayload);
    return res.data;
  },

  async register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<AuthResponse> {
    const { data: res } = await api.post<ApiResponse<AuthResponse>>('/auth/register', {
      email,
      password,
      displayName,
    } satisfies RegisterPayload);
    return res.data;
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
    const { data: res } = await api.get<ApiResponse<AuthResponse['user']>>('/auth/me');
    return res.data;
  },
};

export default authService;
