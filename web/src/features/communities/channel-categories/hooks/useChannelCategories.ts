import {
  useMutation,
  type UseMutationResult,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import { useCurrentUser } from '@/features/auth/stores/current-user-context';

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
  const user = useCurrentUser();
  const token = user.status === 'signed-in' ? user.accessToken : undefined;
  const queryClient = useQueryClient();
  const queryKey = ['channel-categories', workspaceId, token];

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['channel-categories', workspaceId] });
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
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ categoryId, input }: UpdateChannelCategoryParams) => {
      if (!token || !workspaceId) throw new Error('Not signed in');
      return updateChannelCategory(token, workspaceId, categoryId, input);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (categoryId: string) => {
      if (!token || !workspaceId) throw new Error('Not signed in');
      return deleteChannelCategory(token, workspaceId, categoryId);
    },
    onSuccess: () => {
      invalidate();
      // Deleting a category un-categorizes its channels server-side.
      void queryClient.invalidateQueries({ queryKey: ['channels', workspaceId] });
    },
  });

  return { query, create, update, remove };
}
