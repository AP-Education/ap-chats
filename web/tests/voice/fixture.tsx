import './fixture.css';

import { CurrentUserContext } from '@ap-education/shell-sdk';
import { UploadQueue } from '@ap-education/timeline/composer';
import { ThemeProvider } from '@ap-education/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Button, Layout } from 'antd';
import { StrictMode, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import type { CallSignal } from '@/features/calls/schemas';
import { useCallStore } from '@/features/calls/store/call-store';
import { RealtimeContext } from '@/features/realtime/stores/realtime-context';
import type { RealtimeSocketClient } from '@/features/realtime/types';
import {
  ConversationProvider,
  type ConversationScope,
} from '@/features/social/conversation-scope/store';
import { MentionEditor } from '@/features/social/mentions/components/MentionEditor/MentionEditor';
import { sendMessage } from '@/features/social/messaging/api/messages-api';
import { uploadTransport } from '@/features/social/messaging/attachments/attachments-api';
import { MessageComposer } from '@/features/social/messaging/components/MessageComposer/MessageComposer';
import { ConversationOutbox } from '@/features/social/messaging/sending/stores/conversation-outbox';
import type {
  ConversationSending,
  Outboxes,
} from '@/features/social/messaging/sending/stores/outboxes';
import { OutboxesContext } from '@/features/social/messaging/sending/stores/outboxes-context';
import type { Message } from '@/features/social/messaging/types';
import { I18nProvider } from '@/shared/i18n/I18nProvider';

import { runNativeTimelineScenario } from './native-timeline-scenario';
import { VoiceHistory } from './voice-history';

const workspaceId = '10000000-0000-4000-8000-000000000001';
const first = '20000000-0000-4000-8000-000000000001';
const second = '20000000-0000-4000-8000-000000000002';
const socket = { on() {}, off() {}, emit() {} } as unknown as RealtimeSocketClient;
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function Fixture() {
  const [channelId, setChannel] = useState(first);
  const [identity, setIdentity] = useState('voice-fixture');
  useEffect(() => {
    const changeChat = () => setChannel((value) => (value === first ? second : first));
    const changeAccount = () => setIdentity((value) => `${value}-next`);
    const incoming = () =>
      useCallStore.setState({ incoming: { callId: 'fixture-call' } as CallSignal });
    window.addEventListener('fixture:incoming-call', incoming);
    window.addEventListener('fixture:change-chat', changeChat);
    window.addEventListener('fixture:change-account', changeAccount);
    return () => {
      window.removeEventListener('fixture:incoming-call', incoming);
      window.removeEventListener('fixture:change-chat', changeChat);
      window.removeEventListener('fixture:change-account', changeAccount);
    };
  }, []);
  const [messages, setMessages] = useState<(Message & { channelId: string })[]>([]);
  const [outboxes] = useState<Outboxes>(() => {
    const items = new Map<string, ConversationSending>();
    return {
      setSession() {},
      for(scope) {
        const key = `${scope.identity}:${scope.channelId}`;
        let sending = items.get(key);
        if (!sending) {
          const transport = uploadTransport(
            { workspaceId, channelId: scope.channelId },
            () => 'fixture-only',
          );
          const uploads = new UploadQueue(transport);
          const outbox = new ConversationOutbox({
            uploads,
            storage: { read: () => [], write() {} },
            post: (input, signal) =>
              sendMessage('fixture-only', workspaceId, scope.channelId, input, signal),
            recordSent: async (message) =>
              setMessages((previous) => [...previous, { ...message, channelId: scope.channelId }]),
          });
          sending = { uploads, outbox };
          items.set(key, sending);
        }
        return sending;
      },
    };
  });
  const scope: ConversationScope = {
    workspaceId,
    channelId,
    title: channelId === first ? 'Команда продукту' : 'Особистий чат',
    composer: { ariaLabel: 'Повідомлення', placeholder: 'Написати повідомлення…' },
    permissions: { canPost: true, canReact: true, canManage: false, canPin: false },
  };
  const sending = outboxes.for({ identity, workspaceId, channelId });
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('native')) return;
    const timer = setTimeout(() => void runNativeTimelineScenario(sending), 500);
    return () => clearTimeout(timer);
  }, [sending]);
  return (
    <CurrentUserContext.Provider
      value={{
        status: 'signed-in',
        accessToken: 'fixture-only',
        queryIdentity: identity,
        signOut() {},
      }}
    >
      <OutboxesContext.Provider value={outboxes}>
        <Layout className="fixture-shell">
          <header>
            <h1>{scope.title}</h1>
            <Button onClick={() => setChannel(channelId === first ? second : first)}>
              Змінити чат
            </Button>
            <Button onClick={() => setIdentity(`${identity}-next`)}>Змінити акаунт</Button>
          </header>
          <ConversationProvider key={`${identity}:${channelId}`} scope={scope}>
            <section className="fixture-history" aria-label="Історія чату">
              <p>Запишіть голосове, прослухайте та надішліть його.</p>
              <VoiceHistory
                messages={messages.filter((message) => message.channelId === channelId)}
                sending={sending}
              />
            </section>
            <MessageComposer
              onSend={(input, nonce) => {
                void sending.outbox.send(input, nonce);
              }}
            >
              <MentionEditor />
            </MessageComposer>
          </ConversationProvider>
        </Layout>
      </OutboxesContext.Provider>
    </CurrentUserContext.Provider>
  );
}

const appearance = new URLSearchParams(location.search).has('dark') ? 'dark' : 'light';
document.documentElement.dataset.theme = appearance;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider appearance={appearance}>
      <QueryClientProvider client={client}>
        <RealtimeContext.Provider value={{ status: 'idle', socket, error: null }}>
          <BrowserRouter>
            <Suspense>
              <I18nProvider>
                <Fixture />
              </I18nProvider>
            </Suspense>
          </BrowserRouter>
        </RealtimeContext.Provider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
