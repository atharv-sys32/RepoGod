import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { FullPageSpinner } from '@/components/ui/Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, token } = useAuthStore();
  const location = useLocation();

  // If we have a token in localStorage but store hasn't hydrated yet
  const localToken = localStorage.getItem('rg_token');

  if (!isAuthenticated && !localToken) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Token exists but store not hydrated yet — show spinner briefly
  if (!isAuthenticated && localToken) {
    return <FullPageSpinner label="Restoring session..." />;
  }

  return <>{children}</>;
}
