import type { PendingStatus } from '@ap-education/timeline';
import { defineEntryKind, type EntryKind, type EntryViewProps } from '@ap-education/timeline/react';

import { CallLogRow } from '../components/CallLogRow/CallLogRow';
import { MessageRow } from '../components/MessageRow/MessageRow';
import type { DeliveryStatus } from '../types';
import type { CallEntry, ConversationEntry, MessageEntry } from './chat-entry';

const DELIVERY: Record<PendingStatus, DeliveryStatus> = {
  preparing: 'uploading',
  sending: 'sending',
  failed: 'failed',
};

// The rows' parts read the entry's anchor, status and place in its run from the view's context.
function MessageEntryView({ entry, status }: EntryViewProps<MessageEntry>) {
  return (
    <MessageRow
      item={entry.payload.item}
      delivery={status && DELIVERY[status]}
      pendingAttachments={entry.payload.pendingAttachments}
    />
  );
}

function CallEntryView({ entry }: EntryViewProps<CallEntry>) {
  return <CallLogRow item={entry.payload.item} />;
}

/** The history's own kinds; the timeline adds those of the conversation's extensions. */
export const chatKinds: EntryKind<ConversationEntry>[] = [
  defineEntryKind<ConversationEntry, 'MESSAGE'>({
    kind: 'MESSAGE',
    view: MessageEntryView,
    // A deleted message keeps its place for read state and replies, but has nothing to draw.
    isHidden: (entry) => entry.payload.item.message.markdown === null,
  }),
  defineEntryKind<ConversationEntry, 'CALL'>({ kind: 'CALL', view: CallEntryView }),
];
