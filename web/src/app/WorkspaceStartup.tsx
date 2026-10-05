import type { PropsWithChildren } from 'react';

import { useWorkspaces } from '../features/workspaces/hooks/useWorkspaces';
import { AppLoading } from '../shared/ui/AppLoading/AppLoading';

export function WorkspaceStartup({ children }: PropsWithChildren) {
  const workspaces = useWorkspaces();

  if (workspaces.isPending && !workspaces.isFetched) return <AppLoading />;

  return <>{children}</>;
}
