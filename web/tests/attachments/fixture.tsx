import '@/index.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { ConversationPane } from '@/domain/conversation/ConversationPane';
import { CurrentUserContext } from '@/features/auth/stores/current-user-context';
import { ConversationProvider } from '@/features/social/conversation/store';
import { MentionEditor } from '@/features/social/mentions/components/MentionEditor/MentionEditor';
import { sendMessage } from '@/features/social/messaging/api/messages-api';
import type { Attachment, AttachmentDraft } from '@/features/social/messaging/attachments/types';
import { MessageComposer } from '@/features/social/messaging/components/MessageComposer/MessageComposer';
import { MessageRow } from '@/features/social/messaging/components/MessageRow/MessageRow';
import type { PendingAttachmentCommit } from '@/features/social/messaging/hooks/useMessageOperations';
import type { MessageHistoryItem, SendMessageCommand } from '@/features/social/messaging/types';

const useStyles = createStyles(({ token, css }) => ({
  layout: css`
    display: flex;
    height: 100dvh;
    min-height: 0;
    background: ${token.colorBgContainer};
  `,
  sidebar: css`
    width: 240px;
    flex-shrink: 0;
    padding: 24px;
    border-right: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorFillQuaternary};
    @media (max-width: ${token.screenMD}px) {
      display: none;
    }
  `,
  channel: css`
    flex: 1;
    min-width: 0;
    max-width: 1000px;
  `,
  body: css`
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  `,
  history: css`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-block: 20px;
  `,
}));

const image: Attachment = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'План команди.png',
  size: 145000,
  mediaType: 'image/png',
  preview: 'image' as const,
  width: 640,
  height: 420,
  description: 'План роботи команди на квартал',
};
const file: Attachment = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Бюджет проєкту — погоджений.pdf',
  size: 4280000,
  mediaType: 'application/octet-stream',
  preview: null,
  width: null,
  height: null,
  description: null,
};
function item(
  id: string,
  markdown: string,
  attachments: Attachment[] = [file],
): MessageHistoryItem {
  return {
    type: 'MESSAGE',
    id,
    seq: '1',
    createdAt: '2026-10-02T08:00:00Z',
    message: {
      id,
      seq: '1',
      authorMemberId: 'member',
      clientNonce: null,
      markdown,
      attachments,
      contentVersion: 1,
      revision: 1,
      replyToMessageId: null,
      quoteText: null,
      isForwarded: false,
      forwardedFromMemberId: null,
      createdAt: '2026-10-02T08:00:00Z',
      editedAt: null,
      deletedAt: null,
    },
    author: { memberId: 'member', displayName: 'Олена Коваль', avatarPath: null },
    reply: null,
    forwardedFrom: null,
    pin: null,
  };
}

interface UploadingEntry {
  item: MessageHistoryItem;
  drafts: AttachmentDraft[];
}

function Fixture() {
  const { styles } = useStyles();
  const [channelId, setChannelId] = useState('channel');
  const [messages, setMessages] = useState(() => [
    item('seed-1', 'Колеги, надсилаю матеріали до зустрічі.', [image, file]),
    item('seed-2', 'Дякую! Перегляну до кінця дня.', []),
  ]);
  const [uploading, setUploading] = useState<ReadonlyMap<string, UploadingEntry>>(() => new Map());

  async function finalize(
    input: Omit<SendMessageCommand, 'clientNonce' | 'attachments'>,
    attachments: Attachment[],
  ) {
    const message = await sendMessage('test-token', 'workspace', channelId, {
      ...input,
      clientNonce: crypto.randomUUID(),
      ...(attachments.length ? { attachments } : {}),
    });
    setMessages((current) => [
      ...current,
      { ...item(message.id, message.markdown ?? '', message.attachments ?? []), message },
    ]);
  }

  // Mirrors useMessageOperations.send(): sending never waits on attachment
  // upload completion, so the message renders right away as 'uploading' —
  // tracking the commit's drafts live — and only becomes a real send once
  // every attachment reaches 'ready'.
  function send(
    input: Omit<SendMessageCommand, 'clientNonce' | 'attachments'>,
    pending?: PendingAttachmentCommit,
  ) {
    if (!pending) {
      void finalize(input, []);
      return;
    }
    const { nonce, drafts, watchCommitted, uncommit, releaseCommitted } = pending;
    setUploading((current) => {
      const next = new Map(current);
      next.set(nonce, { item: item(nonce, input.markdown, []), drafts });
      return next;
    });
    const unsubscribe = watchCommitted(nonce, (nextDrafts) => {
      if (nextDrafts.some((draft) => draft.status === 'error')) {
        unsubscribe();
        uncommit(nonce);
        setUploading((current) => {
          const next = new Map(current);
          next.delete(nonce);
          return next;
        });
        return;
      }
      setUploading((current) => {
        if (!current.has(nonce)) return current;
        const next = new Map(current);
        next.set(nonce, { ...next.get(nonce)!, drafts: nextDrafts });
        return next;
      });
      if (nextDrafts.every((draft) => draft.status === 'ready')) {
        unsubscribe();
        releaseCommitted(nonce);
        setUploading((current) => {
          const next = new Map(current);
          next.delete(nonce);
          return next;
        });
        void finalize(
          input,
          nextDrafts.map((draft) => ({
            ...draft.attachment!,
            description: draft.description || null,
          })),
        );
      }
    });
  }
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <strong>AP Connect</strong>
        <p>Команда продукту</p>
        <Button
          type="text"
          onClick={() => setChannelId((current) => (current === 'channel' ? 'other' : 'channel'))}
        >
          Змінити канал
        </Button>
      </aside>
      <div className={styles.channel}>
        <ConversationProvider
          key={channelId}
          scope={{
            workspaceId: 'workspace',
            channelId,
            kind: 'channel',
            title: 'Дизайн і продукт',
            composer: { ariaLabel: 'Повідомлення', placeholder: 'Написати повідомлення…' },
          }}
        >
          <ConversationPane title="# Дизайн і продукт">
            <div className={styles.body} data-conversation-drop-target>
              <div className={styles.history} role="log">
                {messages.map((message) => (
                  <MessageRow
                    key={message.id}
                    item={message}
                    groupStart
                    groupEnd
                    actionContext={{
                      memberId: 'member',
                      canManage: true,
                      canPin: true,
                      canPost: true,
                    }}
                    actions={[]}
                    onAction={() => undefined}
                    onJump={() => undefined}
                    onEdit={async () => undefined}
                  />
                ))}
                {[...uploading.entries()].map(([nonce, entry]) => (
                  <MessageRow
                    key={nonce}
                    item={entry.item}
                    delivery="uploading"
                    pendingAttachments={entry.drafts}
                    groupStart
                    groupEnd
                    actionContext={{
                      memberId: 'member',
                      canManage: true,
                      canPin: true,
                      canPost: true,
                    }}
                    actions={[]}
                    onAction={() => undefined}
                    onJump={() => undefined}
                    onEdit={async () => undefined}
                  />
                ))}
              </div>
              <MessageComposer onSend={send}>
                <MentionEditor />
              </MessageComposer>
            </div>
          </ConversationPane>
        </ConversationProvider>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={new QueryClient()}>
      <CurrentUserContext.Provider
        value={{
          status: 'signed-in',
          accessToken: 'test-token',
          queryIdentity: 'test-user',
          signOut: () => undefined,
        }}
      >
        <ThemeProvider>
          <Fixture />
        </ThemeProvider>
      </CurrentUserContext.Provider>
    </QueryClientProvider>
  </StrictMode>,
);
