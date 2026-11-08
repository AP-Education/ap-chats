import './fixture.css';

import { CurrentUserContext } from '@ap-education/shell-sdk';
import { ThemeProvider } from '@ap-education/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Button } from 'antd';
import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';

import { RealtimeContext } from '@/features/realtime/stores/realtime-context';
import type { RealtimeSocketClient } from '@/features/realtime/types';
import { ConversationFooter } from '@/features/social/conversation/components/ConversationView/ConversationFooter';
import { ConversationSelectionBar } from '@/features/social/conversation/components/ConversationView/ConversationSelectionBar';
import { useConversationActions } from '@/features/social/conversation/components/ConversationView/useConversationActions';
import { ConversationProvider } from '@/features/social/conversation-scope/store';
import { sendMessage } from '@/features/social/messaging/api/messages-api';
import { UploadQueue } from '@/features/social/messaging/attachments/upload-queue';
import { MessageActions } from '@/features/social/messaging/components/MessageRow/MessageActions';
import { MessageActionProvider } from '@/features/social/messaging/components/MessageRow/MessageActionScope';
import { PrivateMessageLabel } from '@/features/social/messaging/components/MessageRow/PrivateMessageLabel';
import { useMessageOperations } from '@/features/social/messaging/hooks/useMessageOperations';
import { ConversationOutbox } from '@/features/social/messaging/sending/stores/conversation-outbox';
import type {
  ConversationSending,
  Outboxes,
} from '@/features/social/messaging/sending/stores/outboxes';
import { OutboxesContext } from '@/features/social/messaging/sending/stores/outboxes-context';
import { UnsentMessagesContext } from '@/features/social/messaging/sending/stores/unsent-messages-context';
import { TimelineActionsContext } from '@/features/social/messaging/timeline-actions-context';
import type { MessageHistoryItem } from '@/features/social/messaging/types';
import { MemberSheetProvider } from '@/features/social/people/providers/MemberSheetProvider';
import { StarMeActivity } from '@/features/star-me/components/StarMeActivity/StarMeActivity';
import { useStarMeExtension } from '@/features/star-me/hooks/useStarMeExtension';
import type { WorkspaceMember } from '@/features/workspaces/types';

import { runNativeScenario } from './native-scenario';

const session =
  new URLSearchParams(location.search).get('session') ??
  sessionStorage.getItem('starme-qa-session') ??
  crypto.randomUUID();
sessionStorage.setItem('starme-qa-session', session);
const token = `fixture-only:${session}`;
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const listeners = new Map<string, Set<(event: unknown) => void>>();
const socket = {
  on(name: string, fn: (event: unknown) => void) {
    let set = listeners.get(name);
    if (!set) {
      set = new Set();
      listeners.set(name, set);
    }
    set.add(fn);
  },
  off(name: string, fn: (event: unknown) => void) {
    listeners.get(name)?.delete(fn);
  },
} as unknown as RealtimeSocketClient;
async function api<T>(path: string): Promise<T> {
  const response = await fetch(`/api${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`QA API ${response.status}`);
  return response.json();
}
/** The disposable realtime transport never overlaps requests from the same poller. */
function poll(update: () => Promise<void>, delay: number) {
  let active = true;
  let timer: ReturnType<typeof setTimeout>;
  async function run() {
    try {
      await update();
    } catch (error) {
      if (active) console.error(error);
    }
    if (active) timer = setTimeout(() => void run(), delay);
  }
  void run();
  return () => {
    active = false;
    clearTimeout(timer);
  };
}

interface Session {
  workspaceId: string;
  group: { channelId: string };
  user: WorkspaceMember;
  starMe: WorkspaceMember;
  other: { id: string; participant: { memberId: string } };
}
function Chat({ state, channelId }: { state: Session; channelId: string }) {
  const [messages, setMessages] = useState<MessageHistoryItem[]>([]);
  const extension = useStarMeExtension(state.workspaceId);
  const extensions = useMemo(() => (extension ? [extension] : []), [extension]);
  const [sending] = useState<ConversationSending>(() => {
    const uploads = new UploadQueue({ workspaceId: state.workspaceId, channelId }, () => token);
    const outbox = new ConversationOutbox({
      uploads,
      storage: { read: () => [], write() {} },
      post: (input, signal) => sendMessage(token, state.workspaceId, channelId, input, signal),
      recordSent: async () => {},
    });
    return { uploads, outbox };
  });
  const outboxes = useMemo<Outboxes>(() => ({ setSession() {}, for: () => sending }), [sending]);
  useEffect(() => {
    let active = true;
    const update = async () => {
      const rows = await api<MessageHistoryItem[]>(
        `/workspaces/${state.workspaceId}/channels/${channelId}/qa-history`,
      );
      if (active) setMessages(rows);
    };
    const stop = poll(update, 300);
    return () => {
      active = false;
      stop();
    };
  }, [state.workspaceId, channelId]);
  return (
    <MemberSheetProvider>
      <OutboxesContext.Provider value={outboxes}>
        <ConversationProvider
          extensions={extensions}
          scope={{
            workspaceId: state.workspaceId,
            channelId,
            title: channelId === state.group.channelId ? 'Команда' : 'Іван Петренко',
            composer: { ariaLabel: 'Повідомлення', placeholder: 'Написати повідомлення…' },
            permissions: { canPost: true, canReact: true, canManage: false, canPin: false },
          }}
        >
          <ChatContent state={state} channelId={channelId} items={messages} />
        </ConversationProvider>
      </OutboxesContext.Provider>
    </MemberSheetProvider>
  );
}
function ChatContent({
  state,
  channelId,
  items,
}: {
  state: Session;
  channelId: string;
  items: MessageHistoryItem[];
}) {
  const operations = useMessageOperations(
    state.workspaceId,
    channelId,
    {
      memberId: state.user.id,
      displayName: state.user.profile.displayName,
      avatarPath: null,
      isBot: false,
      roleColor: null,
    },
    items,
  );
  const interaction = useConversationActions({ items, memberId: state.user.id, operations });
  return (
    <TimelineActionsContext.Provider
      value={{
        viewer: interaction.actionContext,
        actions: interaction.actions,
        run: interaction.onAction,
        jumpTo() {},
        saveEdit: interaction.onEdit,
      }}
    >
      <UnsentMessagesContext.Provider value={operations.unsent}>
        <section className="history" aria-label="Історія чату">
          {items.map((item) => (
            <HistoryRow key={item.id} item={item} own={item.author.memberId === state.user.id} />
          ))}
          <StarMeActivity />
        </section>
        <ConversationSelectionBar interaction={interaction} />
        <div hidden={interaction.selectedItems.length > 0}>
          <ConversationFooter items={items} send={operations.send} />
        </div>
      </UnsentMessagesContext.Provider>
    </TimelineActionsContext.Provider>
  );
}
function HistoryRow({ item, own }: { item: MessageHistoryItem; own: boolean }) {
  const contentRef = useRef<HTMLDivElement>(null);
  return (
    <MessageActionProvider
      value={{ item, author: item.author.displayName ?? '', editing: false }}
      contentRef={contentRef}
    >
      <MessageActions
        rowProps={{
          className: `bubble${own ? ' own' : ''}`,
          'data-message-id': item.message.id,
          'data-private': String(Boolean(item.message.privateToMe)),
          'data-author': item.author.memberId,
          'data-assistant-answer': String(Boolean(item.message.assistantAnswer)),
        }}
      >
        <PrivateMessageLabel />
        <article ref={contentRef}>{item.message.markdown}</article>
      </MessageActions>
    </MessageActionProvider>
  );
}
function Fixture({ state }: { state: Session }) {
  const path = useLocation().pathname;
  const navigate = useNavigate();
  const channelId = path.split('/direct/')[1];
  useEffect(() => {
    let count = 0;
    let active = true;
    const stop = poll(async () => {
      const events = await api<{ name: string; event: unknown }[]>('/qa/events');
      if (!active) return;
      for (const event of events.slice(count)) {
        listeners
          .get('social:changed')
          ?.forEach((listener) => listener({ ...(event.event as object), type: event.name }));
      }
      count = events.length;
    }, 250);
    return () => {
      active = false;
      stop();
    };
  }, []);
  return (
    <main className="fixture">
      <header>
        <h1>
          {channelId === state.group.channelId
            ? 'Команда'
            : channelId
              ? 'Іван Петренко'
              : 'Особисті'}
        </h1>
        {channelId && <Button onClick={() => navigate('/')}>До розмов</Button>}
      </header>
      {channelId ? (
        <Chat key={channelId} state={state} channelId={channelId} />
      ) : (
        <section className="welcome">
          <p>Пишіть колезі та запрошуйте StarMe допомогти у вашій переписці.</p>
          <Button onClick={() => navigate(`/direct/${state.other.id}`)}>Написати Івану</Button>
          <Button onClick={() => navigate(`/direct/${state.group.channelId}`)}>
            Відкрити групу
          </Button>
        </section>
      )}
    </main>
  );
}
const state = await api<Session>('/qa/session');
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider appearance="light">
      <QueryClientProvider client={client}>
        <CurrentUserContext.Provider
          value={{
            status: 'signed-in',
            accessToken: token,
            queryIdentity: token,
            profile: { sub: state.user.profile.oidcUserId },
            signOut() {},
          }}
        >
          <RealtimeContext.Provider value={{ status: 'connected', socket, error: null }}>
            <BrowserRouter>
              <Fixture state={state} />
            </BrowserRouter>
          </RealtimeContext.Provider>
        </CurrentUserContext.Provider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
if (new URLSearchParams(location.search).has('native')) void runNativeScenario(token);
