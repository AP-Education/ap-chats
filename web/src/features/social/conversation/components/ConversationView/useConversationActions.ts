import { message as toast, Modal } from 'antd';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useConversationExtensions } from '@/features/social/conversation-scope/extensions';
import { useConversation, useConversationScope } from '@/features/social/conversation-scope/store';
import { forwardingActions } from '@/features/social/forwarding/actions';
import { messagingActions } from '@/features/social/messaging/actions';
import { flashMessage } from '@/features/social/messaging/flashMessage';
import type { useMessageOperations } from '@/features/social/messaging/hooks/useMessageOperations';
import type {
  EditMessage,
  HistoryItem,
  MessageHistoryItem,
} from '@/features/social/messaging/types';
import type {
  ActionCommands,
  ActionTarget,
  ConversationAction,
} from '@/features/social/messaging/types';
import { isMessageItem } from '@/features/social/messaging/types';
import { pinActions } from '@/features/social/pins/actions';
import { usePinActions } from '@/features/social/pins/hooks/usePins';
import { reactionActions } from '@/features/social/reactions/actions';
import { readStateActions } from '@/features/social/read-state/actions';
import { useMarkUnread } from '@/features/social/read-state/hooks/useMarkUnread';

const builtInActions = [
  ...messagingActions,
  ...forwardingActions,
  ...pinActions,
  ...reactionActions,
  ...readStateActions,
];

interface UseConversationActionsInput {
  items: HistoryItem[];
  memberId: string | undefined;
  operations: ReturnType<typeof useMessageOperations>;
}

export function useConversationActions({
  items,
  memberId,
  operations,
}: UseConversationActionsInput) {
  const { t } = useTranslation(['conversation', 'common']);
  const { workspaceId, channelId, permissions } = useConversationScope();
  const { canPost, canReact, canManage, canPin } = permissions;
  const pins = usePinActions(workspaceId, channelId);
  const markUnread = useMarkUnread(workspaceId, channelId);
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
    () => ({ memberId, canPost, canReact, canManage, canPin }),
    [memberId, canPost, canReact, canManage, canPin],
  );
  const extensions = useConversationExtensions();
  const actions = useMemo(
    () => [...builtInActions, ...extensions.flatMap((extension) => extension.actions ?? [])],
    [extensions],
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
            ? t(($) => $.delete.titleOne)
            : t(($) => $.delete.titleMany, { count: targetItems.length }),
        content: t(($) => $.delete.content),
        okText: t(($) => $.common.actions.delete),
        okType: 'danger',
        cancelText: t(($) => $.common.actions.cancel),
        onOk: async () => {
          try {
            await operations.remove(targetItems.map((item) => item.message.id));
            clearSelection();
          } catch {
            toast.error(t(($) => $.delete.failed));
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
          clearSelection();
        },
        () => toast.error(t(($) => $.copyFailed)),
      );
    },
    forward: (targetItems) =>
      setForwardItems([...targetItems].sort((a, b) => (BigInt(a.seq) < BigInt(b.seq) ? -1 : 1))),
    pin: (item, active) => {
      void pins.update(item.message.id, active).catch(() => toast.error(t(($) => $.pinFailed)));
    },
    markUnread: (item) => {
      markUnread.mutate(item.seq, {
        onError: () => toast.error(t(($) => $.markUnreadFailed)),
      });
    },
    showReactions: (item) => setReactionsMessageId(item.message.id),
    ask: (member, targetItems) => {
      setIntent({ kind: 'ask', member, messageIds: targetItems.map((item) => item.message.id) });
      clearSelection();
    },
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
  const onEdit = useCallback<EditMessage>(
    (item, edit, overwrite) =>
      editRef
        .current(item.message.id, edit, overwrite ? undefined : item.message.revision)
        .then(() => undefined),
    [],
  );

  function closeForward() {
    setForwardItems([]);
    clearSelection();
  }

  return {
    actions,
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
