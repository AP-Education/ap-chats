import { Page, PageBody, PageHeader, PageTitle } from '@ap-education/ui';
import { useMemo, useState } from 'react';

import { MentionEditor } from '@/features/social/mentions/components/MentionEditor/MentionEditor';
import { MessageComposer } from '@/features/social/messaging/components/MessageComposer/MessageComposer';
import { MessageTimeline } from '@/features/social/messaging/components/MessageTimeline/MessageTimeline';
import { useMessageOperations } from '@/features/social/messaging/hooks/useMessageOperations';
import { OutboxesProvider } from '@/features/social/messaging/sending/providers/OutboxesProvider';
import { UnsentMessagesContext } from '@/features/social/messaging/sending/stores/unsent-messages-context';
import { TimelineActionsContext } from '@/features/social/messaging/timeline-actions-context';
import type {
  ComposedMessage,
  HistoryWindow,
  MessageHistoryItem,
} from '@/features/social/messaging/types';
import { MemberSheetProvider } from '@/features/social/people/providers/MemberSheetProvider';
import { PeerReadContext } from '@/features/social/read-receipts/stores/peer-read-context';
import { ChatBackdrop } from '@/features/social/wallpaper/components/ChatBackdrop';
import { ChatWallpaperSurface } from '@/features/social/wallpaper/components/ChatWallpaperSurface';

const viewer = {
  memberId: 'member',
  canManage: false,
  canPin: false,
  canPost: true,
  canReact: true,
};
const noMore = { available: false, loading: false, load: async () => undefined };

function textMessage(
  base: MessageHistoryItem,
  id: string,
  seq: string,
  markdown: string,
  own: boolean,
): MessageHistoryItem {
  return {
    ...base,
    id,
    seq,
    message: {
      ...base.message,
      id,
      seq,
      markdown,
      authorMemberId: own ? 'member' : 'peer',
      attachments: [],
    },
    author: {
      ...base.author,
      memberId: own ? 'member' : 'peer',
      displayName: own ? 'Ви' : 'Олена Коваль',
    },
  };
}

/** Uses the production timeline, rows, bubbles, wallpaper and composer with a fixed test history. */
interface ChatFixtureProps {
  video: MessageHistoryItem;
  ownVideo: boolean;
  caption?: string;
  children: (items: MessageHistoryItem[], content: React.ReactNode) => React.ReactNode;
}

export function ChatFixture(props: ChatFixtureProps) {
  return (
    <OutboxesProvider>
      <ChatScenario {...props} />
    </OutboxesProvider>
  );
}

function ChatScenario({
  video,
  ownVideo,
  caption = 'Поглянь, будь ласка. Деталі обговоримо в чаті.',
  children,
}: ChatFixtureProps) {
  const [items, setItems] = useState(() => [
    textMessage(video, 'intro', '1', 'Ось коротке відео з нашої зустрічі.', false),
    {
      ...video,
      seq: '2',
      message: {
        ...video.message,
        seq: '2',
        authorMemberId: ownVideo ? 'member' : 'peer',
        markdown: caption,
      },
      author: {
        ...video.author,
        memberId: ownVideo ? 'member' : 'peer',
        displayName: ownVideo ? 'Ви' : 'Олена Коваль',
      },
    },
    textMessage(video, 'reply', '3', 'Дякую! Зараз перегляну 👍', true),
  ]);
  const history = useMemo<HistoryWindow>(
    () => ({
      pages: [
        {
          items,
          snapshotSeq: String(items.length),
          firstUnreadSeq: null,
          unreadCount: 0,
          hasOlder: false,
          olderCursor: null,
          hasNewer: false,
          newerCursor: null,
          readState: null,
          peerReadSeq: '3',
        },
      ],
      older: noMore,
      newer: noMore,
    }),
    [items],
  );
  const ownAuthor = useMemo(
    () => ({ ...video.author, memberId: 'member', displayName: 'Ви' }),
    [video.author],
  );
  const operations = useMessageOperations('workspace', 'channel', ownAuthor, items);
  const actions = useMemo(
    () => ({
      viewer,
      actions: [],
      run: () => undefined,
      jumpTo: () => undefined,
      saveEdit: async () => undefined,
    }),
    [],
  );

  function send(input: ComposedMessage, nonce: string) {
    void operations.send(input, nonce).then((message) =>
      setItems((current) => [
        ...current,
        {
          ...video,
          id: message.id,
          seq: message.seq,
          createdAt: message.createdAt,
          message,
          author: ownAuthor,
        },
      ]),
    );
  }

  return (
    <MemberSheetProvider>
      <TimelineActionsContext.Provider value={actions}>
        <UnsentMessagesContext.Provider value={operations.unsent}>
          <PeerReadContext.Provider value="3">
            {children(
              items,
              <Page className="chat-screen">
                <ChatBackdrop />
                <PageHeader>
                  <PageTitle># команда продукту</PageTitle>
                  <span className="qa-label">Тестовий чат</span>
                </PageHeader>
                <PageBody transparent>
                  <ChatWallpaperSurface className="chat-body">
                    <MessageTimeline history={history} displayItems={operations.displayItems} />
                    <footer className="chat-composer">
                      <MessageComposer onSend={send}>
                        <MentionEditor />
                      </MessageComposer>
                    </footer>
                  </ChatWallpaperSurface>
                </PageBody>
              </Page>,
            )}
          </PeerReadContext.Provider>
        </UnsentMessagesContext.Provider>
      </TimelineActionsContext.Provider>
    </MemberSheetProvider>
  );
}
