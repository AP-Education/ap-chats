import { useIsMobile } from '@ap/shell-ui';
import { createContext, type PropsWithChildren, type RefObject, useContext, useState } from 'react';

import type {
  ActionContext,
  ActionTarget,
  ConversationAction,
} from '@/features/social/conversation/actions';

import type { AttachmentDraft } from '../../attachments/types';
import type { DeliveryStatus, MessageHistoryItem } from '../../types';

interface MessageActionInput {
  item: MessageHistoryItem;
  author: string;
  context: ActionContext;
  actions: ConversationAction[];
  onAction: (action: ConversationAction, target: ActionTarget) => void;
  editing: boolean;
  delivery?: DeliveryStatus;
  pendingAttachments?: AttachmentDraft[];
}

interface MessageActionScope extends MessageActionInput {
  isMobile: boolean;
  messageTarget: ActionTarget;
  selectedText: string;
  textTarget: ActionTarget;
  available: (target: ActionTarget) => ConversationAction[];
  action: (id: string) => ConversationAction | undefined;
  captureSelection: () => void;
}

const MessageActionContext = createContext<MessageActionScope | null>(null);

export function MessageActionProvider({
  value,
  contentRef,
  children,
}: PropsWithChildren<{
  value: MessageActionInput;
  contentRef: RefObject<HTMLDivElement | null>;
}>) {
  const isMobile = useIsMobile();
  const [selectedText, setSelectedText] = useState('');
  const messageTarget: ActionTarget = { kind: 'message', items: [value.item] };
  const textTarget: ActionTarget = {
    kind: 'text',
    items: [value.item],
    selectedText,
  };

  function captureSelection() {
    const selection = window.getSelection();
    const content = contentRef.current;
    if (!selection || !content || !selection.anchorNode || !selection.focusNode) return;
    const within = content.contains(selection.anchorNode) && content.contains(selection.focusNode);
    setSelectedText(within ? selection.toString().trim().slice(0, 2048) : '');
  }

  function available(target: ActionTarget) {
    if (value.delivery) return [];
    return value.actions.filter((action) => action.available(target, value.context));
  }

  function action(id: string) {
    return value.actions.find((entry) => entry.id === id);
  }

  return (
    <MessageActionContext.Provider
      value={{
        ...value,
        isMobile,
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
