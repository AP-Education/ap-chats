import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useCurrentUser } from '../../auth/stores/current-user-context';
import { listWorkspaces } from '../api/workspaces-api';
import type { Workspace } from '../types';

export function useWorkspaces(): UseQueryResult<Workspace[]> {
  const user = useCurrentUser();
  const token = user.status === 'signed-in' ? user.accessToken : undefined;

  return useQuery({
    queryKey: ['workspaces', token],
    queryFn: () => listWorkspaces(token as string),
    enabled: Boolean(token),
  });
}
