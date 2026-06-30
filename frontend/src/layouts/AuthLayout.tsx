import React from 'react';
import { Outlet } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-gray-950 px-4 py-12">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8 gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-900/50">
          <Zap size={24} className="text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">
            RepoGod
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            AI-Powered Repository Intelligence
          </p>
        </div>
      </div>

      {/* Auth card */}
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl p-8">
          <Outlet />
        </div>
      </div>

      <p className="mt-8 text-xs text-gray-600">
        &copy; {new Date().getFullYear()} RepoGod. All rights reserved.
      </p>
    </div>
  );
}
