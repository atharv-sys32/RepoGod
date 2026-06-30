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

interface BackendAuthData {
  accessToken: string;
  refreshToken: string;
  email: string;
  displayName: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

function mapLoginResponse(d: BackendAuthData): AuthResponse {
  return {
    token: d.accessToken,
    user: {
      id: d.email,           // backend doesn't return id, use email as stable identifier
      email: d.email,
      displayName: d.displayName,
      createdAt: new Date().toISOString(), // backend doesn't return createdAt
    },
  };
}

const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data: res } = await api.post<ApiResponse<BackendAuthData>>('/auth/login', {
      email,
      password,
    });
    return mapLoginResponse(res.data);
  },

  async register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<AuthResponse> {
    const { data: res } = await api.post<ApiResponse<BackendAuthData>>('/auth/register', {
      email,
      password,
      displayName,
    });
    return mapLoginResponse(res.data);
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
    const { data: res } = await api.get<ApiResponse<BackendAuthData>>('/auth/me');
    return mapLoginResponse(res.data).user;
  },
};

export default authService;
