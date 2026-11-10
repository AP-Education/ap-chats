import type { EntryStatus } from '@ap-education/timeline/react';

import { useIsReadByPeer } from '@/features/social/read-receipts/stores/peer-read-context';

import { useMessageActionScope } from './MessageActionScope';

/**
 * How far one's own message went once it landed: read when the others have read up to it, sent
 * before; one still on its way keeps the status the timeline gives it.
 */
export function useOwnMessageStatus(): EntryStatus | undefined {
  const { item, isOwn } = useMessageActionScope();
  const isRead = useIsReadByPeer(item.seq);
  if (!isOwn) return undefined;
  return isRead ? 'read' : 'sent';
}
