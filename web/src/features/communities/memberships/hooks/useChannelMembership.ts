import {
  useMutation,
  type UseMutationResult,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import type { Channel } from '../../channels/types';
import { communityQueryKeys } from '../../queryKeys';
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
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const channelListKey = communityQueryKeys.channelLists(identity, workspaceId);
  const channelKey = communityQueryKeys.channel(identity, workspaceId, channelId);
  const membersKey = communityQueryKeys.members(identity, workspaceId, channelId);

  async function setOptimisticMembership(isMember: boolean) {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: channelListKey }),
      queryClient.cancelQueries({ queryKey: channelKey }),
    ]);
    const previousLists = queryClient.getQueriesData<Channel[]>({ queryKey: channelListKey });
    const previousChannel = queryClient.getQueryData<Channel>(channelKey);
    queryClient.setQueriesData<Channel[]>({ queryKey: channelListKey }, (channels) =>
      channels?.map((channel) => (channel.id === channelId ? { ...channel, isMember } : channel)),
    );
    queryClient.setQueryData<Channel>(channelKey, (channel) =>
      channel ? { ...channel, isMember } : undefined,
    );
    return { previousLists, previousChannel };
  }

  function rollbackMembership(
    snapshot: Awaited<ReturnType<typeof setOptimisticMembership>> | undefined,
  ) {
    for (const [key, channels] of snapshot?.previousLists ?? []) {
      queryClient.setQueryData(key, channels);
    }
    if (snapshot?.previousChannel) queryClient.setQueryData(channelKey, snapshot.previousChannel);
  }

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: channelListKey });
    void queryClient.invalidateQueries({ queryKey: channelKey });
    void queryClient.invalidateQueries({ queryKey: membersKey });
  }

  const query = useQuery({
    queryKey: membersKey,
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
    onMutate: () => setOptimisticMembership(true),
    onError: (_error, _variables, context) => rollbackMembership(context),
    onSuccess: (membership) => {
      queryClient.setQueryData<ChannelMembership[]>(membersKey, (members) =>
        members && !members.some((item) => item.memberId === membership.memberId)
          ? [...members, membership]
          : members,
      );
    },
    onSettled: invalidate,
  });

  const add = useMutation({
    mutationFn: (memberId: string) =>
      addChannelMember(token as string, workspaceId, requireChannel(), memberId),
    onSuccess: (membership) => {
      queryClient.setQueryData<ChannelMembership[]>(membersKey, (members) =>
        members && !members.some((item) => item.memberId === membership.memberId)
          ? [...members, membership]
          : members,
      );
      invalidate();
    },
  });

  const leave = useMutation({
    mutationFn: () => leaveChannel(token as string, workspaceId, requireChannel()),
    onMutate: () => setOptimisticMembership(false),
    onError: (_error, _variables, context) => rollbackMembership(context),
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (memberId: string) =>
      removeChannelMember(token as string, workspaceId, requireChannel(), memberId),
    onMutate: async (memberId) => {
      await queryClient.cancelQueries({ queryKey: membersKey });
      const previous = queryClient.getQueryData<ChannelMembership[]>(membersKey);
      queryClient.setQueryData<ChannelMembership[]>(membersKey, (members) =>
        members?.filter((member) => member.memberId !== memberId),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(membersKey, context.previous);
    },
    onSettled: invalidate,
  });

  return { query, join, add, leave, remove };
}
