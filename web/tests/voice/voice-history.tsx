import { useMemo, useSyncExternalStore } from 'react';

import { MessageTimeline } from '@/features/social/messaging/components/MessageTimeline/MessageTimeline';
import type { ConversationSending } from '@/features/social/messaging/sending/stores/outboxes';
import { UnsentMessagesContext } from '@/features/social/messaging/sending/stores/unsent-messages-context';
import { unsentRows } from '@/features/social/messaging/sending/utils/unsent-rows';
import { TimelineActionsContext } from '@/features/social/messaging/timeline-actions-context';
import type { Message, MessageAuthor, MessageHistoryItem } from '@/features/social/messaging/types';
import { MemberSheetProvider } from '@/features/social/people/providers/MemberSheetProvider';
import { PeerReadContext } from '@/features/social/read-receipts/stores/peer-read-context';
import { ChatBackdrop } from '@/features/social/wallpaper/components/ChatBackdrop';
import { ChatWallpaperSurface } from '@/features/social/wallpaper/components/ChatWallpaperSurface';

import { fixtureHistory } from '../media/chat-fixture';

const author: MessageAuthor = {
  memberId: 'fixture',
  displayName: 'Ви',
  avatarPath: null,
  isBot: false,
  roleColor: null,
};
const actions = {
  viewer: {
    memberId: author.memberId,
    canManage: false,
    canPin: false,
    canPost: true,
    canReact: true,
  },
  actions: [],
  run() {},
  jumpTo() {},
  saveEdit: async () => {},
};

export function VoiceHistory({
  messages,
  sending,
}: {
  messages: Message[];
  sending: ConversationSending;
}) {
  const snapshot = useSyncExternalStore(sending.outbox.subscribe, sending.outbox.getSnapshot);
  const items = useMemo<MessageHistoryItem[]>(
    () =>
      messages.map((message) => ({
        type: 'MESSAGE',
        id: message.id,
        seq: message.seq,
        createdAt: message.createdAt,
        message,
        author:
          message.authorMemberId === author.memberId
            ? author
            : { ...author, memberId: message.authorMemberId, displayName: 'Олена Коваль' },
        reply: null,
        context: null,
        forwardedFrom: null,
        pin: null,
      })),
    [messages],
  );
  const view = useMemo(() => fixtureHistory(items), [items]);
  const pending = unsentRows(
    snapshot,
    new Set(messages.flatMap((message) => (message.clientNonce ? [message.clientNonce] : []))),
    author,
    items,
  );
  const unsent = useMemo(
    () => ({
      retry: (nonce: string) => sending.outbox.retry(nonce),
      discard: (nonce: string) => sending.outbox.cancel(nonce),
      discardFile: (nonce: string, key: string) => sending.outbox.cancelFile(nonce, key),
    }),
    [sending],
  );

  return (
    <MemberSheetProvider>
      <TimelineActionsContext.Provider value={actions}>
        <UnsentMessagesContext.Provider value={unsent}>
          <PeerReadContext.Provider value="0">
            <ChatWallpaperSurface className="fixture-timeline">
              <ChatBackdrop />
              <MessageTimeline view={view} pending={pending} />
            </ChatWallpaperSurface>
          </PeerReadContext.Provider>
        </UnsentMessagesContext.Provider>
      </TimelineActionsContext.Provider>
    </MemberSheetProvider>
  );
}
