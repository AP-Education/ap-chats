import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { communityQueryKeys } from '../../queryKeys';
import { createChannel, deleteChannel, updateChannel } from '../api/channels-api';
import type { Channel, CreateChannelInput, UpdateChannelInput } from '../types';

interface UpdateChannelParams {
  channelId: string;
  input: UpdateChannelInput;
}

interface ChannelActionsResult {
  create: UseMutationResult<Channel, Error, CreateChannelInput>;
  update: UseMutationResult<Channel, Error, UpdateChannelParams>;
  remove: UseMutationResult<void, Error, string>;
}

// Create/rename/delete — the mutations behind ChannelFormModal and the
// channel header's manage actions.
export function useChannelActions(workspaceId: string): ChannelActionsResult {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const channelListKey = communityQueryKeys.channelLists(identity, workspaceId);

  function updateCachedChannel(channelId: string, change: (channel: Channel) => Channel) {
    queryClient.setQueriesData<Channel[]>({ queryKey: channelListKey }, (channels) =>
      channels?.map((channel) => (channel.id === channelId ? change(channel) : channel)),
    );
    queryClient.setQueriesData<Channel>(
      { queryKey: communityQueryKeys.channel(identity, workspaceId, channelId) },
      (channel) => (channel ? change(channel) : undefined),
    );
  }

  async function snapshotChannel(channelId: string) {
    const detailKey = communityQueryKeys.channel(identity, workspaceId, channelId);
    await Promise.all([
      queryClient.cancelQueries({ queryKey: channelListKey }),
      queryClient.cancelQueries({ queryKey: detailKey }),
    ]);
    return {
      previousLists: queryClient.getQueriesData<Channel[]>({ queryKey: channelListKey }),
      previousDetails: queryClient.getQueriesData<Channel>({ queryKey: detailKey }),
    };
  }

  function rollback(snapshot: Awaited<ReturnType<typeof snapshotChannel>> | undefined) {
    for (const [key, channels] of snapshot?.previousLists ?? []) {
      queryClient.setQueryData(key, channels);
    }
    for (const [key, channel] of snapshot?.previousDetails ?? []) {
      queryClient.setQueryData(key, channel);
    }
  }

  function invalidate(channel: Channel) {
    void queryClient.invalidateQueries({ queryKey: channelListKey });
    void queryClient.invalidateQueries({
      queryKey: communityQueryKeys.channel(identity, workspaceId, channel.id),
    });
  }

  const create = useMutation({
    mutationFn: (input: CreateChannelInput) => {
      if (!token) throw new Error('Not signed in');
      return createChannel(token, workspaceId, input);
    },
    onSuccess: (channel) => {
      queryClient.setQueriesData<Channel[]>({ queryKey: channelListKey }, (channels) => {
        if (!channels || channels.some((item) => item.id === channel.id)) return channels;
        return [...channels, channel];
      });
      queryClient.setQueryData(
        communityQueryKeys.channel(identity, workspaceId, channel.id),
        channel,
      );
      invalidate(channel);
    },
  });

  const update = useMutation({
    mutationFn: ({ channelId, input }: UpdateChannelParams) => {
      if (!token) throw new Error('Not signed in');
      return updateChannel(token, workspaceId, channelId, input);
    },
    onMutate: async ({ channelId, input }) => {
      const snapshot = await snapshotChannel(channelId);
      updateCachedChannel(channelId, (channel) => ({ ...channel, ...input }));
      return snapshot;
    },
    onError: (_error, _variables, context) => rollback(context),
    onSuccess: (channel) => {
      updateCachedChannel(channel.id, () => channel);
    },
    onSettled: (_data, _error, { channelId }) => {
      void queryClient.invalidateQueries({ queryKey: channelListKey });
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.channel(identity, workspaceId, channelId),
      });
    },
  });

  const remove = useMutation({
    mutationFn: (channelId: string) => {
      if (!token) throw new Error('Not signed in');
      return deleteChannel(token, workspaceId, channelId);
    },
    onMutate: async (channelId) => {
      const snapshot = await snapshotChannel(channelId);
      queryClient.setQueriesData<Channel[]>({ queryKey: channelListKey }, (channels) =>
        channels?.filter((channel) => channel.id !== channelId),
      );
      return snapshot;
    },
    onError: (_error, _variables, context) => rollback(context),
    onSuccess: (_data, channelId) => {
      queryClient.removeQueries({
        queryKey: communityQueryKeys.channel(identity, workspaceId, channelId),
      });
      queryClient.removeQueries({
        queryKey: communityQueryKeys.members(identity, workspaceId, channelId),
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: channelListKey });
    },
  });

  return { create, update, remove };
}
