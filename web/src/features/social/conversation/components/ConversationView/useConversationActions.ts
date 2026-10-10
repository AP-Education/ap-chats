import { message as toast, Modal } from 'antd';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { forwardingActions } from '@/features/social/forwarding/actions';
import { messagingActions } from '@/features/social/messaging/actions';
import { flashMessage } from '@/features/social/messaging/flashMessage';
import type { useMessageOperations } from '@/features/social/messaging/hooks/useMessageOperations';
import type { HistoryItem, MessageHistoryItem } from '@/features/social/messaging/types';
import { isMessageItem } from '@/features/social/messaging/types';
import { pinActions } from '@/features/social/pins/actions';
import { usePinActions } from '@/features/social/pins/hooks/usePins';
import { reactionActions } from '@/features/social/reactions/actions';

import type { ActionCommands, ActionTarget, ConversationAction } from '../../actions';
import { useConversation, useConversationScope } from '../../store';

export const conversationActions = [
  ...messagingActions,
  ...forwardingActions,
  ...pinActions,
  ...reactionActions,
];

interface UseConversationActionsInput {
  items: HistoryItem[];
  memberId: string | undefined;
  canManage: boolean;
  canPin: boolean;
  canPost: boolean;
  operations: ReturnType<typeof useMessageOperations>;
}

export function useConversationActions({
  items,
  memberId,
  canManage,
  canPin,
  canPost,
  operations,
}: UseConversationActionsInput) {
  const { workspaceId, channelId } = useConversationScope();
  const pins = usePinActions(workspaceId, channelId);
  const [forwardItems, setForwardItems] = useState<MessageHistoryItem[]>([]);
  const [reactionsMessageId, setReactionsMessageId] = useState<string | null>(null);
  const selectedIds = useConversation((state) => state.selectedIds);
  const clearSelection = useConversation((state) => state.clearSelection);
  const toggleSelected = useConversation((state) => state.toggleSelected);
  const setIntent = useConversation((state) => state.setIntent);
  const setEditingId = useConversation((state) => state.setEditingId);
  const selectedItems = useMemo(
    () => items.filter(isMessageItem).filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds],
  );
  const reactionsItem = useMemo(
    () => items.filter(isMessageItem).find((item) => item.id === reactionsMessageId),
    [items, reactionsMessageId],
  );
  const actionContext = useMemo(
    () => ({ memberId, canManage, canPin, canPost }),
    [memberId, canManage, canPin, canPost],
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
    showReactions: (item) => setReactionsMessageId(item.message.id),
  };
  const commandsRef = useRef(commands);
  useLayoutEffect(() => {
    commandsRef.current = commands;
  });
  const onAction = useCallback((action: ConversationAction, target: ActionTarget) => {
    action.execute(target, commandsRef.current);
  }, []);

  const editRef = useRef(operations.edit);
  useLayoutEffect(() => {
    editRef.current = operations.edit;
  });
  const onEdit = useCallback(
    (item: MessageHistoryItem, markdown: string, overwrite?: boolean) =>
      editRef
        .current(item.message.id, markdown, overwrite ? undefined : item.message.revision)
        .then(() => undefined),
    [],
  );

  function closeForward() {
    setForwardItems([]);
    clearSelection();
  }

  return {
    actionContext,
    selectedItems,
    clearSelection,
    onAction,
    onEdit,
    forwardItems,
    closeForward,
    reactionsItem,
    closeReactions: () => setReactionsMessageId(null),
  };
}
