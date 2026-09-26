import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useQueryAuth } from '../../auth/hooks/useQueryAuth';
import { listWorkspaces } from '../api/workspaces-api';
import type { Workspace } from '../types';

export function useWorkspaces(): UseQueryResult<Workspace[]> {
  const { token, identity } = useQueryAuth();

  return useQuery({
    queryKey: ['workspaces', identity],
    queryFn: () => listWorkspaces(token as string),
    enabled: Boolean(token),
  });
}
