import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MessageSquare, Clock, ArrowRight, FolderGit2 } from 'lucide-react';
import { useWorkspaces, useCreateWorkspace } from '@/hooks/useWorkspaces';
import { useConversations } from '@/hooks/useConversation';
import repositoryService from '@/services/repository.service';
import { WorkspaceCard } from '@/features/workspace/WorkspaceCard';
import { CreateWorkspaceModal } from '@/features/workspace/CreateWorkspaceModal';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { formatRelativeTime } from '@/utils/format';
import { useAuthStore } from '@/store/auth.store';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: workspaces, isLoading: wsLoading } = useWorkspaces();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const createWorkspace = useCreateWorkspace();

  const recentWorkspaces = workspaces?.slice(0, 6) ?? [];
  const firstWorkspaceId = workspaces?.[0]?.id;
  const { data: conversations } = useConversations(firstWorkspaceId ?? '');

  const handleCreate = async (title: string, repoUrl?: string) => {
    let repoId: string | undefined;
    if (repoUrl) {
      const repo = await repositoryService.importRepository(repoUrl);
      repoId = repo.id;
    }
    await createWorkspace.mutateAsync({ title, repositoryId: repoId });
    setShowCreateModal(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">
          {greeting()}, {user?.displayName?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Here's what's happening across your repositories.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Workspaces',
            value: workspaces?.length ?? 0,
            icon: <MessageSquare size={18} className="text-indigo-400" />,
          },
          {
            label: 'Repositories',
            value: workspaces?.filter((w) => w.repositoryId).length ?? 0,
            icon: <FolderGit2 size={18} className="text-emerald-400" />,
          },
          {
            label: 'Conversations',
            value: conversations?.length ?? 0,
            icon: <MessageSquare size={18} className="text-blue-400" />,
          },
          {
            label: 'Active Today',
            value: workspaces?.filter((w) => {
              const last = w.lastOpenedAt ?? w.updatedAt;
              return new Date(last).toDateString() === new Date().toDateString();
            }).length ?? 0,
            icon: <Clock size={18} className="text-amber-400" />,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-800 bg-gray-900 px-5 py-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                {stat.label}
              </span>
              {stat.icon}
            </div>
            <p className="text-2xl font-bold text-gray-100">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Workspaces Grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-200">
            Recent Workspaces
          </h2>
          <Link
            to="/workspaces"
            className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View all
            <ArrowRight size={14} />
          </Link>
        </div>

        {wsLoading ? (
          <FullPageSpinner label="Loading workspaces..." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Create card */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-800 bg-gray-900/50 hover:border-indigo-600 hover:bg-gray-900 transition-all duration-150 p-6 text-gray-500 hover:text-indigo-400 min-h-[120px] cursor-pointer"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-current">
                <Plus size={20} />
              </div>
              <span className="text-sm font-medium">Create Workspace</span>
            </button>

            {recentWorkspaces.map((ws) => (
              <WorkspaceCard key={ws.id} workspace={ws} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Conversations */}
      {conversations && conversations.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-200 mb-4">
            Recent Conversations
          </h2>
          <div className="rounded-xl border border-gray-800 bg-gray-900 divide-y divide-gray-800">
            {conversations.slice(0, 5).map((conv) => (
              <Link
                key={conv.id}
                to={`/workspace/${conv.workspaceId}?conversation=${conv.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-800/50 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MessageSquare size={15} className="text-gray-500 shrink-0" />
                  <span className="text-sm text-gray-300 truncate group-hover:text-gray-100">
                    {conv.title ?? 'Untitled conversation'}
                  </span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs text-gray-600">
                    {conv.messageCount} messages
                  </span>
                  <span className="text-xs text-gray-600">
                    {formatRelativeTime(conv.lastMessageAt ?? conv.updatedAt)}
                  </span>
                  <ArrowRight
                    size={14}
                    className="text-gray-600 group-hover:text-indigo-400 transition-colors"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        isLoading={createWorkspace.isPending}
      />
    </div>
  );
}
