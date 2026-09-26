import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/stores/current-user-context';

import { createChannel, setChannelArchived, updateChannel } from '../api/channels-api';
import type { Channel, CreateChannelInput, UpdateChannelInput } from '../types';

interface UpdateChannelParams {
  channelId: string;
  input: UpdateChannelInput;
}

interface SetArchivedParams {
  channelId: string;
  archived: boolean;
}

interface ChannelActionsResult {
  create: UseMutationResult<Channel, Error, CreateChannelInput>;
  update: UseMutationResult<Channel, Error, UpdateChannelParams>;
  setArchived: UseMutationResult<Channel, Error, SetArchivedParams>;
}

// Create/rename/archive — the mutations behind ChannelFormModal and the
// channel header's manage actions.
export function useChannelActions(workspaceId: string): ChannelActionsResult {
  const user = useCurrentUser();
  const token = user.status === 'signed-in' ? user.accessToken : undefined;
  const queryClient = useQueryClient();
  const channelListKey = ['channels', workspaceId];

  function invalidate(channel: Channel) {
    void queryClient.invalidateQueries({ queryKey: ['channels', workspaceId] });
    void queryClient.invalidateQueries({ queryKey: ['channel', workspaceId, channel.id] });
  }

  const create = useMutation({
    mutationFn: (input: CreateChannelInput) => {
      if (!token) throw new Error('Not signed in');
      return createChannel(token, workspaceId, input);
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ channelId, input }: UpdateChannelParams) => {
      if (!token) throw new Error('Not signed in');
      return updateChannel(token, workspaceId, channelId, input);
    },
    onMutate: async ({ channelId, input }) => {
      await queryClient.cancelQueries({ queryKey: channelListKey });
      const detailKey = ['channel', workspaceId, channelId];
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previousLists = queryClient.getQueriesData<Channel[]>({ queryKey: channelListKey });
      const previousDetails = queryClient.getQueriesData<Channel>({ queryKey: detailKey });
      for (const [key, channels] of previousLists) {
        if (!channels) continue;
        queryClient.setQueryData<Channel[]>(
          key,
          channels.map((channel) =>
            channel.id === channelId ? { ...channel, ...input } : channel,
          ),
        );
      }
      for (const [key, channel] of previousDetails) {
        if (channel) queryClient.setQueryData<Channel>(key, { ...channel, ...input });
      }
      return { previousLists, previousDetails };
    },
    onError: (_error, _variables, context) => {
      for (const [key, channels] of context?.previousLists ?? [])
        queryClient.setQueryData(key, channels);
      for (const [key, channel] of context?.previousDetails ?? [])
        queryClient.setQueryData(key, channel);
    },
    onSuccess: (channel) => {
      queryClient.setQueryData(['channel', workspaceId, channel.id, token], channel);
    },
    onSettled: (_data, _error, { channelId }) => {
      void queryClient.invalidateQueries({ queryKey: channelListKey });
      void queryClient.invalidateQueries({ queryKey: ['channel', workspaceId, channelId] });
    },
  });

  const setArchived = useMutation({
    mutationFn: ({ channelId, archived }: SetArchivedParams) => {
      if (!token) throw new Error('Not signed in');
      return setChannelArchived(token, workspaceId, channelId, archived);
    },
    onSuccess: invalidate,
  });

  return { create, update, setArchived };
}
