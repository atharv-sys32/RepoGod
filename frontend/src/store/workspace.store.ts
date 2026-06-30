import { create } from 'zustand';
import type { Workspace } from '@/services/workspace.service';

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  setWorkspace: (workspace: Workspace | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  removeWorkspace: (id: string) => void;
  updateWorkspace: (id: string, patch: Partial<Workspace>) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspace: null,
  workspaces: [],

  setWorkspace: (workspace) => set({ currentWorkspace: workspace }),

  setWorkspaces: (workspaces) => set({ workspaces }),

  addWorkspace: (workspace) =>
    set((state) => ({ workspaces: [workspace, ...state.workspaces] })),

  removeWorkspace: (id) =>
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.id !== id),
      currentWorkspace:
        state.currentWorkspace?.id === id ? null : state.currentWorkspace,
    })),

  updateWorkspace: (id, patch) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === id ? { ...w, ...patch } : w,
      ),
      currentWorkspace:
        state.currentWorkspace?.id === id
          ? { ...state.currentWorkspace, ...patch }
          : state.currentWorkspace,
    })),
}));
