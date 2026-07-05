import React, { useState, useEffect } from 'react';
import { FolderGit2, ArrowRight, GitBranch, Trash2 } from 'lucide-react';
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

interface RepoGroup {
  name: string;
  gitUrl: string;
  status: string;
  repos: Repo[];
}

function groupRepos(repos: Repo[]): RepoGroup[] {
  const map = new Map<string, RepoGroup>();
  for (const repo of repos) {
    const key = `${repo.gitUrl}|${repo.status}`;
    if (map.has(key)) {
      map.get(key)!.repos.push(repo);
    } else {
      map.set(key, {
        name: repo.name,
        gitUrl: repo.gitUrl,
        status: repo.status,
        repos: [repo],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<RepoGroup | null>(null);
  const [noRepoWorkspaces, setNoRepoWorkspaces] = useState<Array<{ id: string; title: string }>>([]);

  const loadRepos = () => {
    repositoryService.getRepositories()
      .then((r) => setRepos(r))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRepos();
    import('@/services/workspace.service').then(({ default: ws }) => {
      ws.getWorkspaces()
        .then((all) => setNoRepoWorkspaces(all.filter((w) => !w.repositoryId).map((w) => ({ id: w.id, title: w.title }))))
        .catch(() => {});
    });
  }, []);

  const groups = groupRepos(repos);

  const handleDeleteGroup = async (group: RepoGroup) => {
    for (const repo of group.repos) {
      await repositoryService.deleteRepository(repo.id).catch(() => {});
    }
    setRepos((prev) => prev.filter((r) => !group.repos.some((gr) => gr.id === r.id)));
    if (selectedGroup?.gitUrl === group.gitUrl && selectedGroup?.status === group.status) {
      setSelectedGroup(null);
    }
    // Refresh no-repo workspaces since deletion may cascade
    import('@/services/workspace.service').then(({ default: ws }) => {
      ws.getWorkspaces()
        .then((all) => setNoRepoWorkspaces(all.filter((w) => !w.repositoryId).map((w) => ({ id: w.id, title: w.title }))))
        .catch(() => {});
    });
  };

  if (loading) {
    return <FullPageSpinner label="Loading repositories..." />;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">Repositories</h1>
        <p className="text-gray-500 text-sm mt-1">
          All imported repositories grouped by status.
        </p>
      </div>

      {selectedGroup ? (
        <div>
          <button
            onClick={() => setSelectedGroup(null)}
            className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors mb-4"
          >
            ← Back to all repositories
          </button>
          <h2 className="text-lg font-semibold text-gray-100 mb-1">
            {selectedGroup.name}
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            {selectedGroup.gitUrl} — {selectedGroup.repos.length} instance(s)
          </p>
          <WorkspacesForGroup group={selectedGroup} />
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {groups.length === 0 ? (
              <div className="col-span-full text-center py-16 text-gray-500">
                <FolderGit2 size={28} className="mx-auto mb-3 text-indigo-400" />
                <p className="text-sm">No repositories imported yet.</p>
              </div>
            ) : (
              groups.map((group) => (
              <div
                key={`${group.gitUrl}|${group.status}`}
                className="relative flex flex-col gap-3 rounded-xl border border-gray-800 bg-gray-900 p-5 hover:border-indigo-600/50 hover:bg-gray-800/60 transition-all duration-150 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn(
                    'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                    group.status === 'INDEXED' ? 'bg-emerald-900/60' : 'bg-red-900/60',
                  )}>
                    <FolderGit2 size={16} className={group.status === 'INDEXED' ? 'text-emerald-400' : 'text-red-400'} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-100 truncate">
                      {group.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {group.gitUrl}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <GitBranch size={12} />
                    <span>{group.repos.length} instance(s)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded',
                      group.status === 'INDEXED' ? 'bg-emerald-900/30 text-emerald-400' :
                      group.status === 'FAILED' ? 'bg-red-900/30 text-red-400' :
                      'bg-gray-800 text-gray-400'
                    )}>
                      {group.status}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group); }}
                      className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      title={`Delete all ${group.status} instances of ${group.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedGroup(group)}
                  className="absolute inset-0 rounded-xl"
                  aria-label={`View workspaces for ${group.name} (${group.status})`}
                />
              </div>
            ))
          )}
          </div>

          {noRepoWorkspaces.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-200 mb-3">
                No Repository ({noRepoWorkspaces.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {noRepoWorkspaces.map((ws) => (
                  <a
                    key={ws.id}
                    href={`/workspace/${ws.id}`}
                    className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 p-5 hover:border-indigo-600/50 hover:bg-gray-800/60 transition-all duration-150"
                  >
                    <span className="text-sm font-semibold text-gray-100 truncate">
                      {ws.title}
                    </span>
                    <ArrowRight size={15} className="text-gray-600 shrink-0 ml-2" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WorkspacesForGroup({ group }: { group: RepoGroup }) {
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; title: string; repositoryId?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('@/services/workspace.service').then(({ default: ws }) => {
      ws.getWorkspaces()
        .then((all) => {
          const repoIds = new Set(group.repos.map((r) => r.id));
          setWorkspaces(all.filter((w) => repoIds.has(w.repositoryId ?? '')));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, [group]);

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
            <a
              key={ws.id}
              href={`/workspace/${ws.id}`}
              className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 p-5 hover:border-indigo-600/50 hover:bg-gray-800/60 transition-all duration-150"
            >
              <span className="text-sm font-semibold text-gray-100 truncate">
                {ws.title}
              </span>
              <ArrowRight size={15} className="text-gray-600 shrink-0 ml-2" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
