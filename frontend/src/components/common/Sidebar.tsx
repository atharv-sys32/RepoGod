import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

const navItems: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={18} />,
    exact: true,
  },
  {
    to: '/workspaces',
    label: 'Workspaces',
    icon: <MessageSquare size={18} />,
  },
  {
    to: '/repositories',
    label: 'Repositories',
    icon: <FolderGit2 size={18} />,
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: <Settings size={18} />,
  },
];

export function Sidebar({ collapsed = false, onToggle, className }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-gray-950 border-r border-gray-800 transition-all duration-200',
        collapsed ? 'w-14' : 'w-56',
        className,
      )}
    >
      {/* Logo area */}
      <div
        className={cn(
          'h-14 flex items-center border-b border-gray-800 px-4',
          collapsed ? 'justify-center' : 'gap-2',
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600">
          <Zap size={15} className="text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-sm tracking-tight text-gray-100">
            RepoGod
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center rounded-lg text-sm font-medium transition-colors duration-100',
                collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200',
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Toggle */}
      {onToggle && (
        <div className="border-t border-gray-800 p-2">
          <button
            onClick={onToggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex items-center w-full rounded-lg px-2 py-2 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors text-sm',
              collapsed ? 'justify-center' : 'gap-2',
            )}
          >
            {collapsed ? (
              <ChevronRight size={16} />
            ) : (
              <>
                <ChevronLeft size={16} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
