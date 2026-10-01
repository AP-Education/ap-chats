import { useQuery } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { apiRequest } from '@/shared/api/http';

import { workspaceUnreadKey } from '../queryKeys';
import type { ChannelUnread } from './useWorkspaceUnread';

export function useWorkspaceUnreadTotal(workspaceId: string | undefined) {
  const { token, identity } = useQueryAuth();
  const unread = useQuery({
    queryKey: workspaceUnreadKey(identity, workspaceId ?? ''),
    queryFn: () =>
      apiRequest<ChannelUnread[]>(`/api/workspaces/${workspaceId}/read-state`, token as string),
    enabled: Boolean(token && workspaceId),
    refetchInterval: 30_000,
  });

  return unread.data?.reduce((total, item) => total + item.unreadCount, 0) ?? 0;
}
