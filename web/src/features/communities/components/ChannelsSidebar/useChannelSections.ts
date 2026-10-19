import type { UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';
import { isWorkspaceAdministrator } from '@/features/workspaces/workspace-access';

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
  isAdministrator: boolean;
  sections: ChannelSectionData[];
  createCategory: UseMutationResult<ChannelCategory, Error, CreateChannelCategoryInput>;
}

// A category id doubles as its section id; channels with no category fall under this key instead.
export const UNCATEGORIZED = 'uncategorized';

// One pass over the channels instead of one filter per category.
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

// Owns the data behind ChannelsSidebar: the person's channels and the workspace categories,
// reshaped into the sections the sidebar renders (categories in order, then "uncategorized").
export function useChannelSections(workspaceId: string): ChannelSectionsResult {
  const { t } = useTranslation('communities');
  const channelsQuery = useChannels(workspaceId);
  const channels = channelsQuery.data;
  const { query: categoriesQuery, create: createCategory } = useChannelCategories(workspaceId);
  const {
    currentMember,
    isLoading: membersLoading,
    isError: membersError,
    retry: retryMembers,
  } = useWorkspaceMemberLabels(workspaceId);

  const isAdministrator = isWorkspaceAdministrator(currentMember);
  const categories = categoriesQuery.data ?? [];
  const channelsByCategory = groupByCategory(channels ?? []);

  const sections: ChannelSectionData[] = [
    ...categories.map((category) => ({
      id: category.id,
      name: category.name,
      channels: channelsByCategory.get(category.id) ?? [],
      canCreateChannel: isAdministrator,
    })),
    {
      id: UNCATEGORIZED,
      name: t(($) => $.channels.noCategory),
      channels: channelsByCategory.get(UNCATEGORIZED) ?? [],
      canCreateChannel: isAdministrator,
    },
  ];

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
    isAdministrator,
    sections,
    createCategory,
  };
}
