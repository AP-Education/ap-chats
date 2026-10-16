import { useQuery } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { channelUnreadTotal } from '../workspace-unread-context';
import { workspaceUnreadQuery } from './useWorkspaceUnread';

/** A workspace's unread channel messages, read from the counts kept live for every workspace. */
export function useWorkspaceChannelUnread(workspaceId: string): number {
  const { token, identity } = useQueryAuth();
  const { data } = useQuery({
    ...workspaceUnreadQuery(identity, token, workspaceId),
    select: channelUnreadTotal,
  });

  return data ?? 0;
}
