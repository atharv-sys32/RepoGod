import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderGit2, ArrowRight, GitBranch } from 'lucide-react';
import repositoryService from '@/services/repository.service';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { formatRelativeTime } from '@/utils/format';
import { cn } from '@/utils/cn';

interface Repo {
  id: string;
  name: string;
  gitUrl: string;
  status: string;
  createdAt: string;
}

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);

  useEffect(() => {
    repositoryService.getRepositories()
      .then((r) => setRepos(r))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedRepo = repos.find((r) => r.id === selectedRepoId);

  if (loading) {
    return <FullPageSpinner label="Loading repositories..." />;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">Repositories</h1>
        <p className="text-gray-500 text-sm mt-1">
          All imported repositories and their workspaces.
        </p>
      </div>

      {selectedRepo ? (
        /* Repo selected — show its workspaces */
        <div>
          <button
            onClick={() => setSelectedRepoId(null)}
            className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors mb-4"
          >
            ← All repositories
          </button>
          <h2 className="text-lg font-semibold text-gray-100 mb-4">
            {selectedRepo.name}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {selectedRepo.gitUrl}
          </p>
          <WorkspacesForRepo repoId={selectedRepoId!} />
        </div>
      ) : (
        /* Show all repos */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {repos.length === 0 ? (
            <div className="col-span-full text-center py-16 text-gray-500">
              <FolderGit2 size={28} className="mx-auto mb-3 text-indigo-400" />
              <p className="text-sm">No repositories imported yet.</p>
            </div>
          ) : (
            repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => setSelectedRepoId(repo.id)}
                className="flex flex-col gap-3 rounded-xl border border-gray-800 bg-gray-900 p-5 hover:border-indigo-600/50 hover:bg-gray-800/60 transition-all duration-150 text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-emerald-900/60 flex items-center justify-center shrink-0">
                    <FolderGit2 size={16} className="text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-100 truncate">
                      {repo.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {repo.gitUrl}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <GitBranch size={12} />
                    <span>{formatRelativeTime(repo.createdAt)}</span>
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded',
                    repo.status === 'INDEXED' ? 'bg-emerald-900/30 text-emerald-400' :
                    repo.status === 'FAILED' ? 'bg-red-900/30 text-red-400' :
                    'bg-gray-800 text-gray-400'
                  )}>
                    {repo.status}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function WorkspacesForRepo({ repoId }: { repoId: string }) {
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; title: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('@/services/workspace.service').then(({ default: ws }) => {
      ws.getWorkspaces()
        .then((all) => setWorkspaces(all.filter((w) => w.repositoryId === repoId)))
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, [repoId]);

  if (loading) {
    return <FullPageSpinner label="Loading workspaces..." />;
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-200 mb-3">Workspaces</h3>
      {workspaces.length === 0 ? (
        <p className="text-sm text-gray-500">No workspaces for this repository.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              to={`/workspace/${ws.id}`}
              className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 p-5 hover:border-indigo-600/50 hover:bg-gray-800/60 transition-all duration-150"
            >
              <span className="text-sm font-semibold text-gray-100 truncate">
                {ws.title}
              </span>
              <ArrowRight size={15} className="text-gray-600 shrink-0 ml-2" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
