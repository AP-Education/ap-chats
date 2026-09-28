import { Alert, Button, message as toast, Modal, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { forwardingActions } from '@/features/social/forwarding/actions';
import { ForwardModal } from '@/features/social/forwarding/components/ForwardModal/ForwardModal';
import { messagingActions } from '@/features/social/messaging/actions';
import { MessageComposer } from '@/features/social/messaging/components/MessageComposer';
import { MessageTimeline } from '@/features/social/messaging/components/MessageTimeline/MessageTimeline';
import { flashMessage } from '@/features/social/messaging/flashMessage';
import { useChannelRealtime } from '@/features/social/messaging/hooks/useChannelRealtime';
import { useMessageHistory } from '@/features/social/messaging/hooks/useMessageHistory';
import { useMessageOperations } from '@/features/social/messaging/hooks/useMessageOperations';
import type { HistoryItem, HistoryPage, SendMessageInput } from '@/features/social/messaging/types';
import { pinActions } from '@/features/social/pins/actions';
import { usePinActions } from '@/features/social/pins/hooks/usePins';
import { useMarkReadOnOpen } from '@/features/social/read-state/hooks/useMarkReadOnOpen';
import type { WorkspaceMember } from '@/features/workspaces/types';

import type { ActionCommands, ActionTarget, ConversationAction } from '../../actions';
import { useConversation, useConversationScope } from '../../store';

const actions = [...messagingActions, ...forwardingActions, ...pinActions];
const emptyPages: HistoryPage[] = [];

const useStyles = createStyles(({ token, css }) => ({
  shell: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  `,
  center: css`
    display: grid;
    place-content: center;
    flex: 1;
    padding: 20px;
  `,
  selection: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 20px;
    border-top: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorPrimaryBg};
  `,
  selectionCount: css`
    flex: 1;
    font-weight: 600;
  `,
}));

interface ConversationViewProps {
  canPost: boolean;
  canManage: boolean;
  currentMember: WorkspaceMember | undefined;
}

export function ConversationView({ canPost, canManage, currentMember }: ConversationViewProps) {
  const { styles } = useStyles();
  const { workspaceId, channelId } = useConversationScope();
  const [params, setParams] = useSearchParams();
  const targetMessageId = params.get('message') ?? undefined;
  const [historyTargetId, setHistoryTargetId] = useState(targetMessageId);
  const history = useMessageHistory(workspaceId, channelId, historyTargetId);
  const author = useMemo(
    () => ({
      memberId: currentMember?.id ?? '',
      displayName: currentMember?.profile.displayName ?? null,
      avatarPath: currentMember?.profile.avatarPath ?? null,
    }),
    [currentMember?.id, currentMember?.profile.displayName, currentMember?.profile.avatarPath],
  );
  useMarkReadOnOpen(workspaceId, channelId, history.data?.pages[0]);
  useChannelRealtime(workspaceId, channelId, canPost, historyTargetId);
  const operations = useMessageOperations(workspaceId, channelId, author);
  const pins = usePinActions(workspaceId, channelId);
  const [forwardItems, setForwardItems] = useState<HistoryItem[]>([]);
  const selectedIds = useConversation((state) => state.selectedIds);
  const clearSelection = useConversation((state) => state.clearSelection);
  const toggleSelected = useConversation((state) => state.toggleSelected);
  const setIntent = useConversation((state) => state.setIntent);
  const setEditingId = useConversation((state) => state.setEditingId);
  const pages = history.data?.pages ?? emptyPages;
  const items = useMemo(() => pages.flatMap((page) => page.items), [pages]);
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.message.id)),
    [items, selectedIds],
  );
  const actionContext = useMemo(
    () => ({ memberId: currentMember?.id, canManage, canPost }),
    [currentMember?.id, canManage, canPost],
  );

  const commands: ActionCommands = {
    reply: (item, quoteText) => {
      setIntent({ kind: 'reply', messageId: item.message.id, quoteText });
      clearSelection();
    },
    edit: (item) => setEditingId(item.message.id),
    remove: (targetItems) => {
      Modal.confirm({
        title:
          targetItems.length === 1
            ? 'Видалити повідомлення?'
            : `Видалити ${targetItems.length} повідомлень?`,
        content: 'Текст повідомлень стане недоступним усім учасникам каналу.',
        okText: 'Видалити',
        okType: 'danger',
        cancelText: 'Скасувати',
        onOk: async () => {
          try {
            await operations.remove(targetItems.map((item) => item.message.id));
            clearSelection();
          } catch {
            toast.error('Не вдалося видалити повідомлення.');
            throw new Error('Delete failed');
          }
        },
      });
    },
    select: (item) => toggleSelected(item.message.id),
    copy: (targetItems, selectedText) => {
      const text =
        selectedText ?? targetItems.map((item) => item.message.markdown ?? '').join('\n\n');
      void navigator.clipboard.writeText(text).then(
        () => {
          targetItems.forEach((item) => flashMessage(item.message.id));
          toast.success('Текст скопійовано');
        },
        () => toast.error('Не вдалося скопіювати текст'),
      );
    },
    forward: (targetItems) =>
      setForwardItems([...targetItems].sort((a, b) => (BigInt(a.seq) < BigInt(b.seq) ? -1 : 1))),
    pin: (item, active) => {
      void pins
        .update(item.message.id, active)
        .catch(() => toast.error('Не вдалося змінити закріплення.'));
    },
  };
  const commandsRef = useRef(commands);
  useLayoutEffect(() => {
    commandsRef.current = commands;
  });
  const onAction = useCallback((action: ConversationAction, target: ActionTarget) => {
    action.execute(target, commandsRef.current);
  }, []);

  const onJump = useCallback(
    (messageId: string) => {
      clearSelection();
      const row = document.getElementById(`message-${messageId}`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (messageId === targetMessageId) flashMessage(messageId);
        else setParams({ message: messageId }, { replace: true });
        return;
      }
      setHistoryTargetId(messageId);
      setParams({ message: messageId }, { replace: true });
    },
    [clearSelection, setParams, targetMessageId],
  );
  const editRef = useRef(operations.edit);
  useLayoutEffect(() => {
    editRef.current = operations.edit;
  });
  const onEdit = useCallback(
    (item: HistoryItem, markdown: string, overwrite?: boolean) =>
      editRef
        .current(item.message.id, markdown, overwrite ? undefined : item.message.revision)
        .then(() => undefined),
    [],
  );

  function send(input: Omit<SendMessageInput, 'clientNonce'>) {
    void operations.send(input).catch(() => undefined);
  }

  const intent = useConversation((state) => state.intent);
  const replyTarget = intent
    ? items.find((item) => item.message.id === intent.messageId)
    : undefined;

  if (history.isPending)
    return (
      <div className={styles.center}>
        <Spin size="large" />
      </div>
    );
  if (history.isError && !history.data)
    return (
      <div className={styles.center}>
        <Alert
          type="error"
          showIcon
          message="Не вдалося завантажити повідомлення"
          action={<Button onClick={() => void history.refetch()}>Повторити</Button>}
        />
      </div>
    );

  return (
    <div className={styles.shell}>
      <MessageTimeline
        key={historyTargetId ?? 'unread'}
        workspaceId={workspaceId}
        channelId={channelId}
        pages={pages}
        outbox={operations.outbox}
        author={author}
        actionContext={actionContext}
        actions={actions}
        onAction={onAction}
        onJump={onJump}
        onEdit={onEdit}
        onRetry={(nonce) => void operations.retry(nonce)?.catch(() => undefined)}
        hasOlder={history.hasPreviousPage}
        hasNewer={history.hasNextPage}
        loadingOlder={history.isFetchingPreviousPage}
        loadingNewer={history.isFetchingNextPage}
        loadOlder={() => history.fetchPreviousPage()}
        loadNewer={() => history.fetchNextPage()}
        targetMessageId={targetMessageId}
      />
      {selectedItems.length > 0 && (
        <div className={styles.selection}>
          <span className={styles.selectionCount}>Вибрано: {selectedItems.length}</span>
          {actions
            .filter((action) =>
              action.available({ kind: 'batch', items: selectedItems }, actionContext),
            )
            .map((action) => (
              <Button
                key={action.id}
                icon={action.icon}
                onClick={() => onAction(action, { kind: 'batch', items: selectedItems })}
              >
                {action.label({ kind: 'batch', items: selectedItems })}
              </Button>
            ))}
          <Button onClick={clearSelection}>Скасувати</Button>
        </div>
      )}
      {canPost && (
        <MessageComposer
          replyAuthor={replyTarget?.author.displayName ?? undefined}
          replyPreview={replyTarget?.message.markdown ?? undefined}
          onSend={send}
        />
      )}
      {forwardItems.length > 0 && (
        <ForwardModal
          workspaceId={workspaceId}
          sourceChannelId={channelId}
          items={forwardItems}
          onClose={() => {
            setForwardItems([]);
            clearSelection();
          }}
        />
      )}
    </div>
  );
}
