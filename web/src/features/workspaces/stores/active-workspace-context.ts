import { createContext, useContext } from 'react';

export interface ActiveWorkspaceStore {
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (workspaceId: string) => void;
}

export const ActiveWorkspaceContext = createContext<ActiveWorkspaceStore | null>(null);

export function useActiveWorkspaceId(): ActiveWorkspaceStore {
  const value = useContext(ActiveWorkspaceContext);
  if (!value) {
    throw new Error('useActiveWorkspaceId must be used within ActiveWorkspaceProvider');
  }
  return value;
}
