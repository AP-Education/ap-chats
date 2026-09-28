import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { Message } from '../messaging/types';
import type { DirectMessage } from './api/direct-messages-api';
import { directMessageKey } from './queryKeys';

interface DirectMessagePage {
  items: DirectMessage[];
  nextCursor: string | null;
}

export function mergeDirectMessage(
  queryClient: QueryClient,
  identity: string | undefined,
  workspaceId: string,
  updated: DirectMessage,
) {
  const key = directMessageKey(identity, workspaceId);
  const detailKey = [...key, updated.id];
  queryClient.setQueryData(detailKey, updated);
  let found = false;
  queryClient.setQueryData<InfiniteData<DirectMessagePage, string | undefined>>(key, (current) => {
    if (!current) return current;
    found = current.pages.some((page) => page.items.some((item) => item.id === updated.id));
    if (!found) return current;
    const pages = current.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => item.id !== updated.id),
    }));
    pages[0] = { ...pages[0]!, items: [updated, ...pages[0]!.items] };
    return { ...current, pages };
  });
  if (!found) void queryClient.invalidateQueries({ queryKey: key, exact: true });
}

export function replaceDirectMessage(
  queryClient: QueryClient,
  identity: string | undefined,
  workspaceId: string,
  updated: DirectMessage,
) {
  const key = directMessageKey(identity, workspaceId);
  queryClient.setQueryData([...key, updated.id], updated);
  queryClient.setQueryData<InfiniteData<DirectMessagePage, string | undefined>>(key, (current) =>
    current
      ? {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => (item.id === updated.id ? updated : item)),
          })),
        }
      : current,
  );
}

export function confirmDirectMessage(
  queryClient: QueryClient,
  identity: string | undefined,
  workspaceId: string,
  channelId: string,
  message: Message,
) {
  const key = directMessageKey(identity, workspaceId);
  const detailKey = [...key, channelId];
  const detail =
    queryClient.getQueryData<DirectMessage>(detailKey) ??
    queryClient
      .getQueryData<InfiniteData<DirectMessagePage, string | undefined>>(key)
      ?.pages.flatMap((page) => page.items)
      .find((item) => item.id === channelId);
  if (!detail) return;
  const updated: DirectMessage = {
    ...detail,
    updatedAt: message.createdAt,
    lastMessage: {
      id: message.id,
      markdown: message.markdown,
      authorMemberId: message.authorMemberId,
      createdAt: message.createdAt,
    },
  };
  mergeDirectMessage(queryClient, identity, workspaceId, updated);
}
