import React from 'react';
import { Link } from 'react-router-dom';
import { FolderGit2, Clock, ArrowUpRight } from 'lucide-react';
import type { Workspace } from '@/services/workspace.service';
import { IndexingBadge } from '@/components/ui/Badge';
import { formatRelativeTime } from '@/utils/format';
import { cn } from '@/utils/cn';

interface WorkspaceCardProps {
  workspace: Workspace;
  className?: string;
}

export function WorkspaceCard({ workspace, className }: WorkspaceCardProps) {
  return (
    <Link
      to={`/workspace/${workspace.id}`}
      className={cn(
        'group flex flex-col gap-3 rounded-xl border border-gray-800 bg-gray-900 p-5 hover:border-indigo-600/50 hover:bg-gray-800/60 transition-all duration-150',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-indigo-900/60 flex items-center justify-center shrink-0">
            <FolderGit2 size={16} className="text-indigo-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-100 truncate group-hover:text-white">
              {workspace.title}
            </p>
            {workspace.repositoryName && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {workspace.repositoryName}
              </p>
            )}
          </div>
        </div>
        <ArrowUpRight
          size={15}
          className="text-gray-600 group-hover:text-indigo-400 transition-colors shrink-0 mt-0.5"
        />
      </div>

      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Clock size={12} />
          <span>{formatRelativeTime(workspace.lastOpenedAt ?? workspace.updatedAt)}</span>
        </div>
        {workspace.indexingStatus && (
          <IndexingBadge status={workspace.indexingStatus} />
        )}
      </div>
    </Link>
  );
}
