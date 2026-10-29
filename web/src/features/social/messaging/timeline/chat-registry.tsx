import type { PendingStatus } from '@ap-education/timeline';
import { createRegistry, defineEntryKind, type EntryViewProps } from '@ap-education/timeline/react';

import { CallLogRow } from '../components/CallLogRow/CallLogRow';
import { MessageRow } from '../components/MessageRow/MessageRow';
import type { DeliveryStatus } from '../types';
import type { CallEntry, ChatEntry, MessageEntry } from './chat-entry';

const DELIVERY: Record<PendingStatus, DeliveryStatus> = {
  preparing: 'uploading',
  sending: 'sending',
  failed: 'failed',
};

function MessageEntryView({ entry, status, anchor }: EntryViewProps<MessageEntry>) {
  return (
    <MessageRow
      item={entry.payload.item}
      delivery={status && DELIVERY[status]}
      pendingAttachments={entry.payload.pendingAttachments}
      anchor={anchor}
    />
  );
}

function CallEntryView({ entry, anchor }: EntryViewProps<CallEntry>) {
  return <CallLogRow item={entry.payload.item} anchor={anchor} />;
}

// A kind this client does not know yet shows nothing rather than breaking the timeline.
export const chatRegistry = createRegistry<ChatEntry>([
  defineEntryKind<ChatEntry, 'MESSAGE'>({
    kind: 'MESSAGE',
    view: MessageEntryView,
    // A deleted message keeps its place for read state and replies, but has nothing to draw.
    isHidden: (entry) => entry.payload.item.message.markdown === null,
  }),
  defineEntryKind<ChatEntry, 'CALL'>({ kind: 'CALL', view: CallEntryView }),
]);
