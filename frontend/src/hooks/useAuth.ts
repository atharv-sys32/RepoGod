import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import authService from '@/services/auth.service';

export function useAuth() {
  const { user, token, isAuthenticated, login, logout, setUser } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      const response = await authService.login(email, password);
      login(response.token, response.user);
      navigate('/dashboard');
    },
    [login, navigate],
  );

  const handleRegister = useCallback(
    async (email: string, password: string, displayName: string) => {
      const response = await authService.register(email, password, displayName);
      login(response.token, response.user);
      navigate('/dashboard');
    },
    [login, navigate],
  );

  const handleLogout = useCallback(async () => {
    await authService.logout();
    logout();
    navigate('/login');
  }, [logout, navigate]);

  return {
    user,
    token,
    isAuthenticated,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    setUser,
  };
}
