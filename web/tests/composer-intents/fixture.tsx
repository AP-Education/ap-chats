import './fixture.css';

import { CurrentUserContext, onNativeMessage, postToNative } from '@ap-education/shell-sdk';
import { UploadQueue } from '@ap-education/timeline/composer';
import { ThemeProvider } from '@ap-education/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Button } from 'antd';
import { StrictMode, Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { RealtimeContext } from '@/features/realtime/stores/realtime-context';
import type { RealtimeSocketClient } from '@/features/realtime/types';
import type { ConversationExtension } from '@/features/social/conversation-scope/extensions';
import {
  ConversationProvider,
  type ConversationScope,
  useConversation,
} from '@/features/social/conversation-scope/store';
import { MentionEditor } from '@/features/social/mentions/components/MentionEditor/MentionEditor';
import { uploadTransport } from '@/features/social/messaging/attachments/attachments-api';
import { MessageComposer } from '@/features/social/messaging/components/MessageComposer/MessageComposer';
import { MessageActionProvider } from '@/features/social/messaging/components/MessageRow/MessageActionScope';
import { MessageTouchActions } from '@/features/social/messaging/components/MessageRow/MessageTouchActions';
import { ConversationOutbox } from '@/features/social/messaging/sending/stores/conversation-outbox';
import { OutboxesContext } from '@/features/social/messaging/sending/stores/outboxes-context';
import { UnsentMessagesContext } from '@/features/social/messaging/sending/stores/unsent-messages-context';
import type { UnsentMessages } from '@/features/social/messaging/sending/types';
import {
  type TimelineActions,
  TimelineActionsContext,
} from '@/features/social/messaging/timeline-actions-context';
import type {
  ComposedMessage,
  ConversationAction,
  MessageHistoryItem,
} from '@/features/social/messaging/types';
import { schedulingExtension } from '@/features/social/scheduling/extension';
import { I18nProvider } from '@/shared/i18n/I18nProvider';

const workspaceId = '10000000-0000-4000-8000-000000000001';
const channelId = '20000000-0000-4000-8000-000000000001';
const memberId = '30000000-0000-4000-8000-000000000001';
const longName = 'Микола Перін з дуже довгим іменем для перевірки заголовка';
const message = 'Чи можна з обмеженим доступом? '.repeat(30);
const quote = `Цитата ${'безпробілів'.repeat(100)}`;
const scope: ConversationScope = {
  workspaceId,
  channelId,
  title: 'Перевірка цитування',
  composer: { ariaLabel: 'Повідомлення', placeholder: 'Написати повідомлення' },
  permissions: { canPost: true, canReact: true, canManage: false, canPin: false },
};
// The send button's other way to send, without the list entry that would fetch the schedule.
const extensions: ConversationExtension[] = [
  { id: 'scheduling', sendOptions: schedulingExtension.sendOptions },
];
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const socket = { on() {}, off() {}, emit() {} } as unknown as RealtimeSocketClient;
const uploads = new UploadQueue(uploadTransport({ workspaceId, channelId }, () => 'fixture-only'));
const outbox = new ConversationOutbox({
  uploads,
  storage: { read: () => [], write() {} },
  post: async () => {
    throw new Error('The fixture never sends to a real conversation');
  },
  recordSent: async () => {},
});
const outboxes = { setSession() {}, for: () => ({ uploads, outbox }) };
// One message of the history, with the production touch actions and a single synthetic action.
const sourceItem = {
  type: 'MESSAGE',
  id: 'source',
  seq: '1',
  createdAt: '2026-11-16T09:00:00.000Z',
  message: {
    id: 'source',
    seq: '1',
    authorMemberId: '30000000-0000-4000-8000-000000000002',
    clientNonce: null,
    markdown: 'Чи можна з обмеженим доступом?',
    contentVersion: 1,
    revision: 1,
    replyToMessageId: null,
    quoteText: null,
    isForwarded: false,
    forwardedFromMemberId: null,
    createdAt: '2026-11-16T09:00:00.000Z',
    editedAt: null,
    deletedAt: null,
  },
  reply: null,
} as unknown as MessageHistoryItem;
const timelineActions: TimelineActions = {
  viewer: { memberId, canManage: false, canPin: false, canPost: true, canReact: false },
  actions: [
    {
      id: 'copy',
      label: () => 'Копіювати текст',
      available: () => true,
      execute() {},
    } as unknown as ConversationAction,
  ],
  run() {},
  jumpTo() {},
  saveEdit: async () => {},
};

function SourceMessage() {
  const contentRef = useRef<HTMLDivElement>(null);
  return (
    <TimelineActionsContext.Provider value={timelineActions}>
      <UnsentMessagesContext.Provider value={{} as UnsentMessages}>
        <MessageActionProvider
          value={{ item: sourceItem, author: longName, editing: false }}
          contentRef={contentRef}
        >
          <MessageTouchActions rowProps={{ 'aria-label': 'Повідомлення в історії' }}>
            <div ref={contentRef}>Чи можна з обмеженим доступом?</div>
          </MessageTouchActions>
        </MessageActionProvider>
      </UnsentMessagesContext.Provider>
    </TimelineActionsContext.Provider>
  );
}

function NativeInsets() {
  useEffect(() => {
    postToNative({
      type: 'navigation/tabs',
      payload: {
        activeId: 'team',
        visible: false,
        items: [
          { id: 'team', label: 'Команда', badge: 0, symbol: { ios: 'person.2', android: 'users' } },
        ],
      },
    });
    return onNativeMessage<{ type: string; inset: number }>((value) => {
      if (value.type !== 'keyboard/inset') return;
      document.documentElement.style.setProperty('--app-keyboard-inset', `${value.inset}px`);
    });
  }, []);
  return null;
}

function Fixture() {
  const setIntent = useConversation((state) => state.setIntent);
  const [sent, setSent] = useState<ComposedMessage[]>([]);
  return (
    <div className="fixture">
      <NativeInsets />
      <header>
        <h1>Перевірка цитування</h1>
        <nav aria-label="Дії повідомлення">
          <Button onClick={() => setIntent({ kind: 'reply', messageId: 'source' })}>
            Відповісти
          </Button>
          <Button
            onClick={() => setIntent({ kind: 'reply', messageId: 'source', quoteText: quote })}
          >
            Цитувати
          </Button>
          <Button
            onClick={() =>
              setIntent({
                kind: 'ask',
                member: { memberId, displayName: longName, avatarPath: null, isBot: true },
                messageIds: ['source'],
              })
            }
          >
            Запитати StarMe
          </Button>
        </nav>
      </header>
      <section className="history" aria-label="Історія чату">
        <SourceMessage />
        <output aria-label="Надіслані повідомлення">{JSON.stringify(sent)}</output>
      </section>
      <MessageComposer
        replyAuthor={longName}
        replyPreview={{ markdown: message }}
        onSend={(input) => setSent((previous) => [...previous, input])}
      >
        <MentionEditor />
      </MessageComposer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider appearance="light">
      <QueryClientProvider client={client}>
        <CurrentUserContext.Provider
          value={{
            status: 'signed-in',
            accessToken: 'fixture-only',
            queryIdentity: 'composer-layout-fixture',
            signOut() {},
          }}
        >
          <OutboxesContext.Provider value={outboxes}>
            <RealtimeContext.Provider value={{ status: 'idle', socket, error: null }}>
              <BrowserRouter>
                <Suspense>
                  <I18nProvider>
                    <ConversationProvider scope={scope} extensions={extensions}>
                      <Fixture />
                    </ConversationProvider>
                  </I18nProvider>
                </Suspense>
              </BrowserRouter>
            </RealtimeContext.Provider>
          </OutboxesContext.Provider>
        </CurrentUserContext.Provider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
