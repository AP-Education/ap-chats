import { Alert, Button, message as toast, Modal, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { forwardingActions } from '@/features/social/forwarding/actions';
import { ForwardModal } from '@/features/social/forwarding/components/ForwardModal/ForwardModal';
import { messagingActions } from '@/features/social/messaging/actions';
import { MessageComposer } from '@/features/social/messaging/components/MessageComposer';
import { MessageTimeline } from '@/features/social/messaging/components/MessageTimeline/MessageTimeline';
import { useChannelRealtime } from '@/features/social/messaging/hooks/useChannelRealtime';
import { useMessageHistory } from '@/features/social/messaging/hooks/useMessageHistory';
import { useMessageOperations } from '@/features/social/messaging/hooks/useMessageOperations';
import type { HistoryItem, HistoryPage, SendMessageInput } from '@/features/social/messaging/types';
import { pinActions } from '@/features/social/pins/actions';
import { usePinActions } from '@/features/social/pins/hooks/usePins';

import type { ActionCommands, ActionTarget, ConversationAction } from '../../actions';
import { useConversation } from '../../store';

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
  workspaceId: string;
  channelId: string;
  channelName: string;
  canPost: boolean;
  canManage: boolean;
  currentMemberId: string | undefined;
}

export function ConversationView({
  workspaceId,
  channelId,
  channelName,
  canPost,
  canManage,
  currentMemberId,
}: ConversationViewProps) {
  const { styles } = useStyles();
  const [params, setParams] = useSearchParams();
  const targetMessageId = params.get('message') ?? undefined;
  const history = useMessageHistory(workspaceId, channelId, targetMessageId);
  useChannelRealtime(workspaceId, channelId, canPost, targetMessageId);
  const operations = useMessageOperations(workspaceId, channelId);
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
    () => ({ memberId: currentMemberId, canManage, canPost }),
    [currentMemberId, canManage, canPost],
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
        () => toast.success('Текст скопійовано'),
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
      setParams({ message: messageId }, { replace: true });
    },
    [clearSelection, setParams],
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
    void operations.send(input).then(
      (sent) => onJump(sent.id),
      () => undefined,
    );
  }

  const intent = useConversation((state) => state.intent);
  const replyLabel = intent
    ? (items.find((item) => item.message.id === intent.messageId)?.message.markdown ?? undefined)
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
        key={targetMessageId ?? 'unread'}
        workspaceId={workspaceId}
        channelId={channelId}
        pages={pages}
        outbox={operations.outbox}
        actionContext={actionContext}
        actions={actions}
        onAction={onAction}
        onJump={onJump}
        onEdit={onEdit}
        onRetry={(nonce) => {
          void operations
            .retry(nonce)
            ?.then((sent) => onJump(sent.id))
            .catch(() => undefined);
        }}
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
          workspaceId={workspaceId}
          channelId={channelId}
          channelName={channelName}
          replyLabel={replyLabel}
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
