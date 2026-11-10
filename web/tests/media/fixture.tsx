import './fixture.css';

import { CurrentUserContext } from '@ap-education/shell-sdk';
import { ThemeProvider } from '@ap-education/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from 'antd';
import { type ReactNode, StrictMode, Suspense, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { RealtimeContext } from '@/features/realtime/stores/realtime-context';
import { ConversationProvider } from '@/features/social/conversation-scope/store';
import { ConversationMedia } from '@/features/social/media-viewer/components/ConversationMedia';
import type { Attachment } from '@/features/social/messaging/attachments/types';
import { VideoFile } from '@/features/social/messaging/components/MessageAttachments/VideoFile';
import type { MessageHistoryItem } from '@/features/social/messaging/types';
import { I18nProvider } from '@/shared/i18n/I18nProvider';

import { ChatFixture, fixtureHistory } from './chat-fixture';

const params = new URLSearchParams(location.search);
const portrait = params.has('portrait');
const attachment: Attachment = {
  id: 'video',
  name: 'Зустріч команди.mp4',
  size: 12000,
  mediaType: 'video/mp4',
  preview: 'video',
  hasThumbnail: !params.has('legacy'),
  width: portrait ? 180 : 320,
  height: portrait ? 320 : 180,
  duration: params.has('long') ? 12 : 2,
  description: null,
};
const createdAt = '2026-10-29T09:00:00Z';
const item: MessageHistoryItem = {
  type: 'MESSAGE',
  id: 'message',
  seq: '1',
  createdAt,
  message: {
    id: 'message',
    seq: '1',
    authorMemberId: 'member',
    clientNonce: null,
    markdown: '',
    attachments: params.has('multiple')
      ? [attachment, { ...attachment, id: 'second', name: 'Друге відео.mp4' }]
      : [attachment],
    blocks: [],
    contentVersion: 1,
    revision: 1,
    replyToMessageId: null,
    quoteText: null,
    isForwarded: false,
    forwardedFromMemberId: null,
    createdAt,
    editedAt: null,
    deletedAt: null,
  },
  author: {
    memberId: 'member',
    displayName: 'Тестовий учасник',
    avatarPath: null,
    roleColor: null,
    isBot: false,
  },
  reply: null,
  context: null,
  forwardedFrom: null,
  pin: null,
};

function MediaViewerProvider({
  items,
  children,
}: {
  items: MessageHistoryItem[];
  children: ReactNode;
}) {
  const view = useMemo(() => fixtureHistory(items), [items]);
  return (
    <ConversationMedia
      view={view}
      actions={{
        actions: [],
        context: {
          memberId: 'member',
          canManage: false,
          canPin: false,
          canPost: true,
          canReact: true,
        },
        run: () => undefined,
      }}
      onShowEntry={() => undefined}
    >
      {children}
    </ConversationMedia>
  );
}

createRoot(document.getElementById('root')!).render(
  <FixtureLifetime>
    <StrictMode>
      <CurrentUserContext.Provider
        value={{
          status: 'signed-in',
          accessToken: 'fixture-only',
          queryIdentity: 'fixture-user',
          signOut: () => undefined,
        }}
      >
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <ThemeProvider appearance={params.has('dark') ? 'dark' : 'light'}>
            <Suspense>
              <I18nProvider>
                <RealtimeContext.Provider value={{ status: 'idle', socket: null, error: null }}>
                  <Layout className="fixture-layout">
                    <ConversationProvider
                      scope={{
                        workspaceId: 'workspace',
                        channelId: 'channel',
                        title: 'Превʼю відео',
                        composer: { ariaLabel: 'Повідомлення', placeholder: 'Написати' },
                        permissions: {
                          canPost: true,
                          canReact: true,
                          canManage: false,
                          canPin: false,
                        },
                      }}
                    >
                      {params.has('chat') ? (
                        <ChatFixture
                          video={item}
                          ownVideo={params.has('own')}
                          caption={
                            params.has('nocaption')
                              ? ''
                              : params.has('longcaption')
                                ? 'Обговоримо деталі після перегляду. '.repeat(40)
                                : undefined
                          }
                        >
                          {(items, content) => (
                            <MediaViewerProvider items={items}>{content}</MediaViewerProvider>
                          )}
                        </ChatFixture>
                      ) : (
                        <MediaViewerProvider items={[item]}>
                          <main>
                            <h1>Превʼю відео</h1>
                            <p>Оригінал завантажується після натискання.</p>
                            <div
                              className="message"
                              style={params.has('offscreen') ? { marginTop: '200vh' } : undefined}
                            >
                              <VideoFile
                                attachment={attachment}
                                messageId="message"
                                available={!params.has('unavailable')}
                              />
                            </div>
                          </main>
                        </MediaViewerProvider>
                      )}
                    </ConversationProvider>
                  </Layout>
                </RealtimeContext.Provider>
              </I18nProvider>
            </Suspense>
          </ThemeProvider>
        </QueryClientProvider>
      </CurrentUserContext.Provider>
    </StrictMode>
  </FixtureLifetime>,
);

function FixtureLifetime({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const leave = () => setOpen(false);
    window.addEventListener('fixture:leave', leave);
    return () => window.removeEventListener('fixture:leave', leave);
  }, []);
  if (!open) return <p>Тестовий чат закрито</p>;
  return children;
}
