import { useActiveWorkspaceId } from '../stores/active-workspace-context';
import type { Workspace } from '../types';
import { useWorkspaces } from './useWorkspaces';

interface ActiveWorkspaceResult {
  workspace: Workspace | undefined;
  workspaces: Workspace[] | undefined;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
  selectWorkspace: (workspaceId: string) => void;
}

// Resolves the persisted active workspace id against the loaded list, falling
// back to the first workspace when nothing (or a stale id) is selected.
export function useActiveWorkspace(): ActiveWorkspaceResult {
  const { data: workspaces, isLoading, isError, refetch } = useWorkspaces();
  const { activeWorkspaceId, setActiveWorkspaceId } = useActiveWorkspaceId();

  const workspace =
    workspaces?.find((candidate) => candidate.id === activeWorkspaceId) ?? workspaces?.[0];

  return {
    workspace,
    workspaces,
    isLoading,
    isError,
    retry: () => void refetch(),
    selectWorkspace: setActiveWorkspaceId,
  };
}
