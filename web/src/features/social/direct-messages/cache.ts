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
  updated: DirectMessage,
) {
  const key = directMessageKey(identity);
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
  updated: DirectMessage,
) {
  const key = directMessageKey(identity);
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
  channelId: string,
  message: Message,
) {
  const key = directMessageKey(identity);
  const detailKey = [...key, channelId];
  const row = queryClient
    .getQueryData<InfiniteData<DirectMessagePage, string | undefined>>(key)
    ?.pages.flatMap((page) => page.items)
    .find((item) => item.id === channelId);
  const detail = queryClient.getQueryData<DirectMessage>(detailKey) ?? row;
  if (!detail) return;
  // A call signal refetches the list but not a closed conversation's detail, so either may hold
  // the newer call.
  const call = laterCall(detail.lastCall, row?.lastCall);
  const updated: DirectMessage = {
    ...detail,
    updatedAt: message.createdAt,
    lastMessage: {
      id: message.id,
      markdown: message.markdown,
      authorMemberId: message.authorMemberId,
      createdAt: message.createdAt,
    },
    // A call that started after this message stays the newest thing in the conversation.
    lastCall: call && Date.parse(call.startedAt) > Date.parse(message.createdAt) ? call : null,
  };
  mergeDirectMessage(queryClient, identity, updated);
}

type LastCall = DirectMessage['lastCall'];

function laterCall(first: LastCall | undefined, second: LastCall | undefined): LastCall {
  if (!first || !second) return first ?? second ?? null;
  return Date.parse(second.startedAt) > Date.parse(first.startedAt) ? second : first;
}
