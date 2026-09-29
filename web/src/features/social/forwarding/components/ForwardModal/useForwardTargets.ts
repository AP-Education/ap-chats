import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useChannels } from '@/features/communities/channels/hooks/useChannels';
import { searchPeople } from '@/features/social/direct-messages/api/direct-messages-api';
import { useDirectMessages } from '@/features/social/direct-messages/hooks/useDirectMessages';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

import type { ForwardTargetGroup, ForwardTargetOption } from './forward-targets';

export type ForwardScope = 'all' | 'direct' | 'channels';

export function useForwardTargets(workspaceId: string) {
  const { token, identity } = useQueryAuth();
  const channels = useChannels(workspaceId, 'joined');
  const conversations = useDirectMessages(workspaceId);
  const [scope, setScope] = useState<ForwardScope>('all');
  const [search, setSearch] = useState('');
  const searchTerm = useDebouncedValue(search.trim(), 180);

  const showDirect = scope !== 'channels';
  const showChannels = scope !== 'direct';
  const people = useQuery({
    queryKey: ['forward-people-search', identity, workspaceId, searchTerm],
    queryFn: () => searchPeople(token as string, workspaceId, searchTerm),
    enabled: Boolean(token && searchTerm && showDirect),
  });
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const matches = (name: string) => name.toLocaleLowerCase().includes(normalizedSearch);
  const directItems = conversations.data?.pages.flatMap((page) => page.items) ?? [];
  const directMemberIds = new Set(directItems.map((item) => item.participant.memberId));
  const direct: ForwardTargetOption[] = directItems
    .filter((item) => matches(item.participant.displayName ?? ''))
    .map((item) => ({
      kind: 'direct',
      id: item.id,
      name: item.participant.displayName ?? 'Ім’я недоступне',
      avatarPath: item.participant.avatarPath,
      detail: item.participant.active ? 'Особиста розмова' : 'Учасник недоступний',
      disabled: !item.participant.active,
    }));
  const joined: ForwardTargetOption[] = (channels.data ?? [])
    .filter((channel) => channel.isMember && matches(channel.name))
    .map((channel) => ({
      kind: 'channel',
      id: channel.id,
      name: channel.name,
      detail: channel.kind === 'private' ? 'Приватний канал' : 'Канал',
      private: channel.kind === 'private',
    }));
  const colleagues: ForwardTargetOption[] =
    searchTerm && searchTerm === search.trim() && people.data
      ? people.data
          .filter((person) => !directMemberIds.has(person.memberId))
          .map((person) => ({
            kind: 'person',
            id: person.memberId,
            name: person.displayName ?? 'Ім’я недоступне',
            avatarPath: person.avatarPath,
            detail: 'Почати особисту розмову',
          }))
      : [];
  const groups: ForwardTargetGroup[] = [
    ...(showDirect ? [{ label: 'Особисті', items: direct }] : []),
    ...(showChannels ? [{ label: 'Канали', items: joined }] : []),
    ...(showDirect ? [{ label: 'Колеги', items: colleagues }] : []),
  ].filter((group) => group.items.length > 0);

  return {
    search,
    setSearch,
    scope,
    setScope,
    groups,
    isLoading: (showDirect && conversations.isPending) || (showChannels && channels.isPending),
    isSearching: Boolean(
      search.trim() && showDirect && (searchTerm !== search.trim() || people.isPending),
    ),
    hasError:
      (showChannels && channels.isError) ||
      (showDirect && conversations.isError) ||
      (showDirect && !!searchTerm && people.isError),
    retry: () => {
      if (channels.isError) void channels.refetch();
      if (conversations.isError) void conversations.refetch();
      if (people.isError) void people.refetch();
    },
    hasMore: showDirect && !search.trim() && conversations.hasNextPage,
    loadingMore: conversations.isFetchingNextPage,
    loadMore: () => void conversations.fetchNextPage(),
  };
}
