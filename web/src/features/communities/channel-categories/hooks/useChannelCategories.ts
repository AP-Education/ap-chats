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
  createChannelCategory,
  deleteChannelCategory,
  listChannelCategories,
  updateChannelCategory,
} from '../api/channel-categories-api';
import type {
  ChannelCategory,
  CreateChannelCategoryInput,
  UpdateChannelCategoryInput,
} from '../types';

interface UpdateChannelCategoryParams {
  categoryId: string;
  input: UpdateChannelCategoryInput;
}

interface ChannelCategoriesResult {
  query: UseQueryResult<ChannelCategory[]>;
  create: UseMutationResult<ChannelCategory, Error, CreateChannelCategoryInput>;
  update: UseMutationResult<ChannelCategory, Error, UpdateChannelCategoryParams>;
  remove: UseMutationResult<void, Error, string>;
}

// Read model + the three owner-only mutations that manage it — always used
// together in ChannelCategoriesModal, so one hook instead of four.
export function useChannelCategories(workspaceId: string | undefined): ChannelCategoriesResult {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const queryKey = communityQueryKeys.categories(identity, workspaceId);
  const channelListKey = communityQueryKeys.channelLists(identity, workspaceId);
  const channelDetailKey = communityQueryKeys.channelDetails(identity, workspaceId);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey });
  }

  const query = useQuery({
    queryKey,
    queryFn: () => listChannelCategories(token as string, workspaceId as string),
    enabled: Boolean(token && workspaceId),
  });

  const create = useMutation({
    mutationFn: (input: CreateChannelCategoryInput) => {
      if (!token || !workspaceId) throw new Error('Not signed in');
      return createChannelCategory(token, workspaceId, input);
    },
    onSuccess: (category) => {
      queryClient.setQueryData<ChannelCategory[]>(queryKey, (categories) =>
        categories ? [...categories, category].sort((a, b) => a.position - b.position) : [category],
      );
      invalidate();
    },
  });

  const update = useMutation({
    mutationFn: ({ categoryId, input }: UpdateChannelCategoryParams) => {
      if (!token || !workspaceId) throw new Error('Not signed in');
      return updateChannelCategory(token, workspaceId, categoryId, input);
    },
    onMutate: async ({ categoryId, input }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ChannelCategory[]>(queryKey);
      queryClient.setQueryData<ChannelCategory[]>(queryKey, (categories) =>
        categories?.map((category) =>
          category.id === categoryId ? { ...category, ...input } : category,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSuccess: (category) => {
      queryClient.setQueryData<ChannelCategory[]>(queryKey, (categories) =>
        categories?.map((item) => (item.id === category.id ? category : item)),
      );
    },
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (categoryId: string) => {
      if (!token || !workspaceId) throw new Error('Not signed in');
      return deleteChannelCategory(token, workspaceId, categoryId);
    },
    onMutate: async (categoryId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey }),
        queryClient.cancelQueries({ queryKey: channelListKey }),
        queryClient.cancelQueries({ queryKey: channelDetailKey }),
      ]);
      const previousCategories = queryClient.getQueryData<ChannelCategory[]>(queryKey);
      const previousLists = queryClient.getQueriesData<Channel[]>({ queryKey: channelListKey });
      const previousDetails = queryClient.getQueriesData<Channel>({ queryKey: channelDetailKey });
      queryClient.setQueryData<ChannelCategory[]>(queryKey, (categories) =>
        categories?.filter((category) => category.id !== categoryId),
      );
      queryClient.setQueriesData<Channel[]>({ queryKey: channelListKey }, (channels) =>
        channels?.map((channel) =>
          channel.categoryId === categoryId ? { ...channel, categoryId: null } : channel,
        ),
      );
      queryClient.setQueriesData<Channel>({ queryKey: channelDetailKey }, (channel) =>
        channel?.categoryId === categoryId ? { ...channel, categoryId: null } : channel,
      );
      return { previousCategories, previousLists, previousDetails };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCategories)
        queryClient.setQueryData(queryKey, context.previousCategories);
      for (const [key, channels] of context?.previousLists ?? []) {
        queryClient.setQueryData(key, channels);
      }
      for (const [key, channel] of context?.previousDetails ?? []) {
        queryClient.setQueryData(key, channel);
      }
    },
    onSettled: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: channelListKey });
      void queryClient.invalidateQueries({ queryKey: channelDetailKey });
    },
  });

  return { query, create, update, remove };
}
