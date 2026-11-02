import { TimelineEntryStatus } from '@ap-education/timeline/react';

import { useIsReadByPeer } from '@/features/social/read-receipts/stores/peer-read-context';

/** One's own message's mark: the timeline shows it on its way or failed, and it is read once the
 * others have read up to it. */
export function DeliveryMark({ seq }: { seq: string }) {
  const isRead = useIsReadByPeer(seq);
  return <TimelineEntryStatus delivery={isRead ? 'read' : 'sent'} />;
}
