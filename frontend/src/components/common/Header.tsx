import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, LogOut, Settings, User, ChevronDown, Zap } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'RG';

  return (
    <header
      className={cn(
        'h-14 flex items-center justify-between px-4 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm z-30',
        className,
      )}
    >
      {/* Logo */}
      <Link
        to="/dashboard"
        className="flex items-center gap-2 text-gray-100 hover:text-white transition-colors"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
          <Zap size={15} className="text-white" />
        </div>
        <span className="font-bold text-base tracking-tight">RepoGod</span>
      </Link>

      {/* Search */}
      <div className="flex-1 max-w-sm mx-6">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-900 border border-gray-800 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
          />
        </div>
      </div>

      {/* User Menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-gray-800 transition-colors text-sm text-gray-300"
        >
          <div className="h-7 w-7 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-semibold text-white">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <span className="hidden sm:block max-w-[120px] truncate">
            {user?.displayName ?? 'Account'}
          </span>
          <ChevronDown size={14} className="text-gray-500" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-gray-800 bg-gray-900 shadow-xl z-50 animate-fade-in py-1">
            <div className="px-4 py-2.5 border-b border-gray-800">
              <p className="text-sm font-medium text-gray-200 truncate">
                {user?.displayName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <Link
              to="/settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors"
            >
              <Settings size={15} />
              Settings
            </Link>
            <Link
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors"
            >
              <User size={15} />
              Profile
            </Link>
            <div className="border-t border-gray-800 mt-1 pt-1">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
