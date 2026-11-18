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

  const confirmed: LastMessage = {
    id: message.id,
    markdown: message.markdown,
    authorMemberId: message.authorMemberId,
    createdAt: message.createdAt,
  };
  // Either cache may be ahead: a call signal or a deletion refetches the list but not a closed
  // conversation's detail, and a list refetch may already hold a later message than this one.
  // The list row goes before the detail, so it wins what is otherwise a tie.
  const lastMessage = freshestMessage([confirmed, row?.lastMessage, detail.lastMessage])!;
  const call = freshestCall([row?.lastCall, detail.lastCall]);
  const callIsLatest = call && Date.parse(call.startedAt) > Date.parse(lastMessage.createdAt);

  const listedAt = row?.updatedAt ?? detail.updatedAt;
  const updated: DirectMessage = {
    ...detail,
    updatedAt: newest([message.createdAt, detail.updatedAt, row?.updatedAt], Date.parse)!,
    lastMessage,
    lastCall: callIsLatest ? call : null,
  };
  // The inbox is ordered by activity: a confirmation that brings nothing newer keeps its place.
  const advanced = Date.parse(updated.updatedAt) > Date.parse(listedAt);
  if (advanced) mergeDirectMessage(queryClient, identity, updated);
  else replaceDirectMessage(queryClient, identity, updated);
}

type LastMessage = NonNullable<DirectMessage['lastMessage']>;
type LastCall = NonNullable<DirectMessage['lastCall']>;

/** The latest of the values present by `time`; on a tie the earlier argument stays. */
function newest<T>(values: (T | null | undefined)[], time: (value: T) => number): T | undefined {
  let best: T | undefined;
  for (const value of values) {
    if (value == null) continue;
    if (best === undefined || time(value) > time(best)) best = value;
  }
  return best;
}

/** The latest message, and of two snapshots of one message a deleted one: a deletion keeps its
 * time, so only the missing text tells the copies apart. On any other tie the earlier stays. */
function freshestMessage(messages: (LastMessage | null | undefined)[]): LastMessage | undefined {
  let best: LastMessage | undefined;
  for (const message of messages) {
    if (!message) continue;
    if (!best) best = message;
    else if (message.id === best.id) {
      if (message.markdown === null && best.markdown !== null) best = message;
    } else if (Date.parse(message.createdAt) > Date.parse(best.createdAt)) best = message;
  }
  return best;
}

// How far a call has gone; a status never moves back, so the further snapshot is the fresher one.
const CALL_PROGRESS: Record<LastCall['status'], number> = {
  ringing: 0,
  active: 1,
  ended: 2,
  declined: 2,
  missed: 2,
};

/** The later call, and of two snapshots of one call the one further along. The list row is
 * passed first: it refetches on call signals, so it wins what is otherwise a tie. */
function freshestCall(calls: (LastCall | null | undefined)[]): LastCall | null {
  let best: LastCall | null = null;
  for (const call of calls) {
    if (!call) continue;
    if (!best) best = call;
    else if (call.id === best.id) {
      if (CALL_PROGRESS[call.status] > CALL_PROGRESS[best.status]) best = call;
    } else if (Date.parse(call.startedAt) > Date.parse(best.startedAt)) best = call;
  }
  return best;
}
