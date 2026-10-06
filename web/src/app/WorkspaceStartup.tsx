import type { PropsWithChildren, ReactNode } from 'react';

import { useWorkspaces } from '../features/workspaces/hooks/useWorkspaces';

export function WorkspaceStartup({
  children,
  fallback,
}: PropsWithChildren<{ fallback: ReactNode }>) {
  const workspaces = useWorkspaces();

  if (workspaces.isPending && !workspaces.isFetched) return fallback;

  return <>{children}</>;
}
