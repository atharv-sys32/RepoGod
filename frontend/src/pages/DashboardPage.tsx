import React, { useState, useEffect } from 'react';
import { Plus, FolderGit2, LayoutGrid } from 'lucide-react';
import { useWorkspaces, useCreateWorkspace } from '@/hooks/useWorkspaces';
import repositoryService from '@/services/repository.service';
import { WorkspaceCard } from '@/features/workspace/WorkspaceCard';
import { CreateWorkspaceModal } from '@/features/workspace/CreateWorkspaceModal';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth.store';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: workspaces, isLoading: wsLoading } = useWorkspaces();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [repoCount, setRepoCount] = useState(0);
  const createWorkspace = useCreateWorkspace();

  useEffect(() => {
    repositoryService.getRepositories().then((repos) => {
      const uniqueUrls = new Set(repos.map((r) => r.gitUrl));
      setRepoCount(uniqueUrls.size);
    }).catch(() => {});
  }, []);

  const handleCreate = async (title: string, repoUrl?: string) => {
    let repoId: string | undefined;
    if (repoUrl) {
      const repo = await repositoryService.importRepository(repoUrl);
      repoId = repo.id;
    }
    await createWorkspace.mutateAsync({ title, repoId });
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
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-gray-800 bg-gray-900 px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Workspaces</span>
            <LayoutGrid size={18} className="text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-gray-100">{workspaces?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Repositories</span>
            <FolderGit2 size={18} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-gray-100">{repoCount}</p>
        </div>
      </div>

      {/* Workspaces Grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-200">Workspaces</h2>
        </div>

        {wsLoading ? (
          <FullPageSpinner label="Loading workspaces..." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-800 bg-gray-900/50 hover:border-indigo-600 hover:bg-gray-900 transition-all duration-150 p-6 text-gray-500 hover:text-indigo-400 min-h-[120px] cursor-pointer"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-current">
                <Plus size={20} />
              </div>
              <span className="text-sm font-medium">Create Workspace</span>
            </button>

            {workspaces?.map((ws) => (
              <WorkspaceCard key={ws.id} workspace={ws} />
            ))}
          </div>
        )}
      </div>

      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        isLoading={createWorkspace.isPending}
      />
    </div>
  );
}
