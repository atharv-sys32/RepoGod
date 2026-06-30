import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import AuthLayout from '@/layouts/AuthLayout';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import WorkspacePage from '@/pages/WorkspacePage';
import SettingsPage from '@/pages/SettingsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },

  // Auth routes
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <LoginPage />,
      },
    ],
  },

  // Protected app routes
  {
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/workspaces',
        element: <DashboardPage />,
      },
      {
        path: '/workspace/:id',
        element: <WorkspacePage />,
      },
      {
        path: '/settings',
        element: <SettingsPage />,
      },
    ],
  },

  // 404 fallback
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

export default router;
