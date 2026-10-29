import type { TimelineSource } from '@ap-education/timeline';

import { ApiError } from '@/shared/api/http';

import { getEntry, historyPage, openHistory } from '../api/messages-api';
import { type ChatEntry, type ChatMeta, metaOf, toEntry } from './chat-entry';

/** A conversation's history read through the messages API. */
export function createChatSource(
  token: string,
  workspaceId: string,
  channelId: string,
): TimelineSource<ChatEntry, ChatMeta> {
  return {
    async window(anchor) {
      const messageId = anchor.at === 'entry' ? anchor.key : undefined;
      const page = await openHistory(token, workspaceId, channelId, messageId);
      return {
        entries: page.items.map(toEntry),
        hasOlder: page.hasOlder,
        hasNewer: page.hasNewer,
        firstUnread: page.firstUnreadSeq,
        known: page.snapshotSeq,
        meta: metaOf(page),
      };
    },

    async page({ direction, from, known }) {
      const side = direction === 'older' ? 'before' : 'after';
      const page = await historyPage(token, workspaceId, channelId, side, from, known ?? undefined);
      return { entries: page.items.map(toEntry), hasOlder: page.hasOlder, hasNewer: page.hasNewer };
    },

    async entry(key) {
      try {
        return toEntry(await getEntry(token, workspaceId, channelId, key));
      } catch (error) {
        const isGone = error instanceof ApiError && error.status === 404;
        if (isGone) return null;
        throw error;
      }
    },
  };
}
