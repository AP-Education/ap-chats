import type { UseMutationResult } from '@tanstack/react-query';

import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';
import type { WorkspaceMember } from '@/features/workspaces/types';

import { useChannelCategories } from '../../channel-categories/hooks/useChannelCategories';
import type { ChannelCategory, CreateChannelCategoryInput } from '../../channel-categories/types';
import { useChannels } from '../../channels/hooks/useChannels';
import type { Channel } from '../../channels/types';

export interface ChannelSectionData {
  id: string;
  name: string;
  channels: Channel[];
  canCreateChannel: boolean;
}

interface ChannelSectionsResult {
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
  isOwner: boolean;
  currentMember: WorkspaceMember | undefined;
  sections: ChannelSectionData[];
  createCategory: UseMutationResult<ChannelCategory, Error, CreateChannelCategoryInput>;
}

// A category id doubles as its section id; joined channels with no category
// fall under this key instead.
export const UNCATEGORIZED = 'uncategorized';

// One pass over the joined channels instead of one filter per category.
function groupByCategory(channels: Channel[]): Map<string, Channel[]> {
  const groups = new Map<string, Channel[]>();
  for (const channel of channels) {
    const key = channel.categoryId ?? UNCATEGORIZED;
    const group = groups.get(key);
    if (group) group.push(channel);
    else groups.set(key, [channel]);
  }
  return groups;
}

// Owns the data behind ChannelsSidebar: the active workspace's channels and
// categories, reshaped into the sections the sidebar renders (categories in
// order, then an "uncategorized" bucket, then public channels the member
// hasn't joined). Keeps that derivation out of the component's JSX.
export function useChannelSections(workspaceId: string): ChannelSectionsResult {
  const channelsQuery = useChannels(workspaceId);
  const channels = channelsQuery.data;
  const { query: categoriesQuery, create: createCategory } = useChannelCategories(workspaceId);
  const {
    currentMember,
    isLoading: membersLoading,
    isError: membersError,
    retry: retryMembers,
  } = useWorkspaceMemberLabels(workspaceId);

  const isOwner = currentMember?.role === 'owner';
  const categories = categoriesQuery.data ?? [];
  const joined = channels?.filter((channel) => channel.isMember) ?? [];
  const discoverable =
    channels?.filter((channel) => !channel.isMember && channel.kind === 'public') ?? [];
  const joinedByCategory = groupByCategory(joined);

  const sections: ChannelSectionData[] = [
    ...categories.map((category) => ({
      id: category.id,
      name: category.name,
      channels: joinedByCategory.get(category.id) ?? [],
      canCreateChannel: isOwner,
    })),
    {
      id: UNCATEGORIZED,
      name: 'Без категорії',
      channels: joinedByCategory.get(UNCATEGORIZED) ?? [],
      canCreateChannel: isOwner,
    },
  ];
  if (discoverable.length) {
    sections.push({
      id: 'discoverable',
      name: 'Публічні канали',
      channels: discoverable,
      canCreateChannel: false,
    });
  }

  return {
    isLoading: channelsQuery.isPending || categoriesQuery.isPending || membersLoading,
    isError:
      (channelsQuery.isError && !channelsQuery.data) ||
      (categoriesQuery.isError && !categoriesQuery.data) ||
      membersError,
    retry: () => {
      if (channelsQuery.isError) void channelsQuery.refetch();
      if (categoriesQuery.isError) void categoriesQuery.refetch();
      if (membersError) retryMembers();
    },
    isOwner,
    currentMember,
    sections,
    createCategory,
  };
}
