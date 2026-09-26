import { type PropsWithChildren, useState } from 'react';

import { ActiveWorkspaceContext } from '../stores/active-workspace-context';

const STORAGE_KEY = 'active-workspace-id';

// Persists which workspace the sider and /channels currently point at. Falling
// back to "the first workspace" when nothing is selected yet is the consuming
// hook's job (useActiveWorkspace) — it's the one that knows the workspace list.
export function ActiveWorkspaceProvider({ children }: PropsWithChildren) {
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  );

  function setActiveWorkspaceId(workspaceId: string) {
    setActiveWorkspaceIdState(workspaceId);
    localStorage.setItem(STORAGE_KEY, workspaceId);
  }

  return (
    <ActiveWorkspaceContext.Provider value={{ activeWorkspaceId, setActiveWorkspaceId }}>
      {children}
    </ActiveWorkspaceContext.Provider>
  );
}
