import { useIsMobile } from '@ap-education/ui';
import {
  createContext,
  type MouseEvent,
  type PropsWithChildren,
  useContext,
  useState,
} from 'react';

import type { AttachmentDraft } from '../../attachments/types';
import { unsentActions } from '../../sending/actions';
import { useUnsentMessages } from '../../sending/stores/unsent-messages-context';
import { useTimelineActions } from '../../timeline-actions-context';
import type { ActionContext, ActionTarget, ConversationAction } from '../../types';
import type { DeliveryStatus, MessageHistoryItem } from '../../types';

interface MessageActionInput {
  item: MessageHistoryItem;
  author: string;
  editing: boolean;
  delivery?: DeliveryStatus;
  pendingAttachments?: AttachmentDraft[];
}

interface MessageActionScope extends MessageActionInput {
  context: ActionContext;
  actions: ConversationAction[];
  onAction: (action: ConversationAction, target: ActionTarget) => void;
  isMobile: boolean;
  isOwn: boolean;
  canReact: boolean;
  messageTarget: ActionTarget;
  selectedText: string;
  textTarget: ActionTarget;
  available: (target: ActionTarget) => ConversationAction[];
  action: (id: string) => ConversationAction | undefined;
  captureSelection: (event: MouseEvent<HTMLElement>) => void;
}

const MessageActionContext = createContext<MessageActionScope | null>(null);

export function MessageActionProvider({
  value,
  children,
}: PropsWithChildren<{ value: MessageActionInput }>) {
  const isMobile = useIsMobile();
  const { viewer, actions, run } = useTimelineActions();
  const unsent = useUnsentMessages();
  const [selectedText, setSelectedText] = useState('');
  const messageTarget: ActionTarget = { kind: 'message', items: [value.item] };
  const textTarget: ActionTarget = {
    kind: 'text',
    items: [value.item],
    selectedText,
  };

  // The row is the event's target, and its text is the part a selection is quoted from.
  function captureSelection(event: MouseEvent<HTMLElement>) {
    const selection = window.getSelection();
    const content = event.currentTarget.querySelector('[data-message-text]');
    if (!selection || !content || !selection.anchorNode || !selection.focusNode) return;
    const within = content.contains(selection.anchorNode) && content.contains(selection.focusNode);
    setSelectedText(within ? selection.toString().trim().slice(0, 2048) : '');
  }

  function available(target: ActionTarget) {
    if (value.delivery) {
      return target.kind === 'message' ? unsentActions(value.delivery, unsent) : [];
    }
    return actions.filter((action) => action.available(target, viewer));
  }

  function action(id: string) {
    return actions.find((entry) => entry.id === id);
  }

  return (
    <MessageActionContext.Provider
      value={{
        ...value,
        context: viewer,
        actions,
        onAction: run,
        isMobile,
        isOwn: value.item.message.authorMemberId === viewer.memberId,
        canReact: !value.delivery && viewer.canReact,
        messageTarget,
        textTarget,
        selectedText,
        available,
        action,
        captureSelection,
      }}
    >
      {children}
    </MessageActionContext.Provider>
  );
}

export function useMessageActionScope() {
  const scope = useContext(MessageActionContext);
  if (!scope) throw new Error('MessageActionProvider is missing');
  return scope;
}
