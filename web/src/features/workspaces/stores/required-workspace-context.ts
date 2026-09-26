import { createContext, useContext } from 'react';

import type { Workspace } from '../types';

export const RequiredWorkspaceContext = createContext<Workspace | null>(null);

export function useRequiredWorkspace(): Workspace {
  const workspace = useContext(RequiredWorkspaceContext);
  if (!workspace) throw new Error('This route requires an active workspace');
  return workspace;
}
