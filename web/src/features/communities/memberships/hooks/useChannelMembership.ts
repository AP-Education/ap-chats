import {
  useMutation,
  type UseMutationResult,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/stores/current-user-context';

import {
  addChannelMember,
  joinChannel,
  leaveChannel,
  listChannelMembers,
  removeChannelMember,
} from '../api/channel-memberships-api';
import type { ChannelMembership } from '../types';

interface ChannelMembershipResult {
  query: UseQueryResult<ChannelMembership[]>;
  join: UseMutationResult<ChannelMembership, Error, void>;
  add: UseMutationResult<ChannelMembership, Error, string>;
  leave: UseMutationResult<void, Error, void>;
  remove: UseMutationResult<void, Error, string>;
}

// Who's in the channel + the four actions that change that (join/add/leave/
// remove) — all consumed together by ChannelMembersPanel and the channel
// header's join/leave button, so one hook instead of five.
export function useChannelMembership(
  workspaceId: string,
  channelId: string | undefined,
): ChannelMembershipResult {
  const user = useCurrentUser();
  const token = user.status === 'signed-in' ? user.accessToken : undefined;
  const queryClient = useQueryClient();

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['channels', workspaceId] });
    void queryClient.invalidateQueries({ queryKey: ['channel', workspaceId, channelId] });
    void queryClient.invalidateQueries({ queryKey: ['channel-members', workspaceId, channelId] });
  }

  const query = useQuery({
    queryKey: ['channel-members', workspaceId, channelId, token],
    queryFn: () => listChannelMembers(token as string, workspaceId, channelId as string),
    enabled: Boolean(token && channelId),
  });

  function requireChannel(): string {
    if (!token) throw new Error('Not signed in');
    if (!channelId) throw new Error('No channel selected');
    return channelId;
  }

  const join = useMutation({
    mutationFn: () => joinChannel(token as string, workspaceId, requireChannel()),
    onSuccess: invalidate,
  });

  const add = useMutation({
    mutationFn: (memberId: string) =>
      addChannelMember(token as string, workspaceId, requireChannel(), memberId),
    onSuccess: invalidate,
  });

  const leave = useMutation({
    mutationFn: () => leaveChannel(token as string, workspaceId, requireChannel()),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (memberId: string) =>
      removeChannelMember(token as string, workspaceId, requireChannel(), memberId),
    onSuccess: invalidate,
  });

  return { query, join, add, leave, remove };
}
