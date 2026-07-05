import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FolderGit2, ArrowRight, GitBranch, Trash2, Plus } from 'lucide-react';
import repositoryService from '@/services/repository.service';
import workspaceService from '@/services/workspace.service';
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const backRepoUrl = searchParams.get('repoUrl');
  const backStatus = searchParams.get('status');
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<RepoGroup | null>(null);
  const [noRepoWorkspaces, setNoRepoWorkspaces] = useState<Array<{ id: string; title: string }>>([]);
  const [groupWsCount, setGroupWsCount] = useState<Record<string, number>>({});
  const [showNewWs, setShowNewWs] = useState(false);
  const [newWsTitle, setNewWsTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateWorkspace = async (repoId?: string) => {
    if (!newWsTitle.trim()) return;
    setCreating(true);
    try {
      const ws = await workspaceService.createWorkspace(newWsTitle.trim(), repoId);
      setShowNewWs(false);
      setNewWsTitle('');
      navigate(`/workspace/${ws.id}`);
    } catch (e) {
      console.error('Failed to create workspace:', e);
    } finally {
      setCreating(false);
    }
  };

  const loadRepos = () => {
    repositoryService.getRepositories()
      .then((r) => setRepos(r))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadWsCounts = useCallback(async () => {
    const allWs = await (await import('@/services/workspace.service')).default.getWorkspaces().catch(() => []);
    const counts: Record<string, number> = {};
    for (const w of allWs) {
      if (w.repositoryId) {
        counts[w.repositoryId] = (counts[w.repositoryId] ?? 0) + 1;
      }
    }
    setGroupWsCount(counts);
  }, []);

  useEffect(() => {
    loadRepos();
    loadWsCounts();
    import('@/services/workspace.service').then(({ default: ws }) => {
      ws.getWorkspaces()
        .then((all) => setNoRepoWorkspaces(all.filter((w) => !w.repositoryId).map((w) => ({ id: w.id, title: w.title }))))
        .catch(() => {});
    });
  }, []);

  // Auto-select repo group from URL params (when navigating back from workspace)
  useEffect(() => {
    if (backRepoUrl && backStatus && repos.length > 0 && !selectedGroup) {
      const allGroups = groupRepos(repos);
      const match = allGroups.find((g) =>
        g.gitUrl.includes(backRepoUrl) && g.status === backStatus
      );
      if (match) setSelectedGroup(match);
    }
  }, [repos, backRepoUrl, backStatus]);

  const groups = groupRepos(repos);

  const handleDeleteWorkspace = async (wsId: string) => {
    try {
      await workspaceService.deleteWorkspace(wsId);
      await refreshAll();
    } catch (e) {
      console.error('Failed to delete workspace:', e);
    }
  };

  const refreshAll = useCallback(async () => {
    const reposData = await repositoryService.getRepositories().catch(() => []);
    const allWs = await (await import('@/services/workspace.service')).default.getWorkspaces().catch(() => []);
    setRepos(reposData);
    setNoRepoWorkspaces(allWs.filter((w) => !w.repositoryId).map((w) => ({ id: w.id, title: w.title })));
    const counts: Record<string, number> = {};
    for (const w of allWs) {
      if (w.repositoryId) {
        counts[w.repositoryId] = (counts[w.repositoryId] ?? 0) + 1;
      }
    }
    setGroupWsCount(counts);
    setSelectedGroup(null);
  }, []);

  const handleDeleteGroup = async (group: RepoGroup) => {
    for (const repo of group.repos) {
      await repositoryService.deleteRepository(repo.id).catch(() => {});
    }
    await refreshAll();
  };

  if (loading) {
    return <FullPageSpinner label="Loading repositories..." />;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Repositories</h1>
          <p className="text-gray-500 text-sm mt-1">
            All imported repositories grouped by status.
          </p>
        </div>
        <button
          onClick={() => setShowNewWs(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} /> New Workspace
        </button>
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
          <WorkspacesForGroup group={selectedGroup} onDelete={handleDeleteWorkspace} />
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
                    <span>{group.repos.reduce((sum, r) => sum + (groupWsCount[r.id] ?? 0), 0)} workspace(s)</span>
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
                      className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 z-10 relative"
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
                  <div key={ws.id} className="relative group">
                    <a
                      href={`/workspace/${ws.id}?from=/dashboard`}
                      className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 p-5 hover:border-indigo-600/50 hover:bg-gray-800/60 transition-all duration-150 pr-10"
                    >
                      <span className="text-sm font-semibold text-gray-100 truncate">
                        {ws.title}
                      </span>
                      <ArrowRight size={15} className="text-gray-600 shrink-0 ml-2" />
                    </a>
                    <span
                      onClick={(e) => { e.stopPropagation(); handleDeleteWorkspace(ws.id); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                      title="Delete workspace"
                    >
                      <Trash2 size={14} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showNewWs && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-6 py-4 flex items-center gap-3 z-50">
          <input
            type="text"
            value={newWsTitle}
            onChange={(e) => setNewWsTitle(e.target.value)}
            placeholder="Workspace name..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-600"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateWorkspace(); if (e.key === 'Escape') setShowNewWs(false); }}
          />
          <button
            onClick={() => handleCreateWorkspace()}
            disabled={creating || !newWsTitle.trim()}
            className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
          <button
            onClick={() => { setShowNewWs(false); setNewWsTitle(''); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-300"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function WorkspacesForGroup({ group, onDelete }: { group: RepoGroup; onDelete: (wsId: string) => void }) {
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
            <div key={ws.id} className="relative group">
              <a
                href={`/workspace/${ws.id}?from=/dashboard&repoUrl=${encodeURIComponent(group.gitUrl)}&status=${group.status}`}
                className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 p-5 hover:border-indigo-600/50 hover:bg-gray-800/60 transition-all duration-150 pr-10"
              >
                <span className="text-sm font-semibold text-gray-100 truncate">
                  {ws.title}
                </span>
                <ArrowRight size={15} className="text-gray-600 shrink-0 ml-2" />
              </a>
              <span
                onClick={(e) => { e.stopPropagation(); onDelete(ws.id); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Delete workspace"
              >
                <Trash2 size={14} />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
