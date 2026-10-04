import type { ReactNode } from 'react';

import { MessageComposer } from '@/features/social/messaging/components/MessageComposer';
import type { useMessageOperations } from '@/features/social/messaging/hooks/useMessageOperations';
import type { HistoryItem, SendMessageInput } from '@/features/social/messaging/types';
import { isMessageItem } from '@/features/social/messaging/types';
import { TypingIndicator } from '@/features/social/typing/components/TypingIndicator';

import { useConversation } from '../../store';

interface ConversationFooterProps {
  canPost: boolean;
  historyReady: boolean;
  readOnlyFooter?: ReactNode;
  items: HistoryItem[];
  send: ReturnType<typeof useMessageOperations>['send'];
}

export function ConversationFooter({
  canPost,
  historyReady,
  readOnlyFooter,
  items,
  send,
}: ConversationFooterProps) {
  if (!canPost) return <>{readOnlyFooter}</>;
  if (!historyReady) return null;

  return <WritableConversationFooter items={items} send={send} />;
}

function WritableConversationFooter({
  items,
  send,
}: Pick<ConversationFooterProps, 'items' | 'send'>) {
  const intent = useConversation((state) => state.intent);
  const replyTarget = intent
    ? items.filter(isMessageItem).find((item) => item.message.id === intent.messageId)
    : undefined;

  function onSend(input: Omit<SendMessageInput, 'clientNonce'>) {
    send(input);
  }

  return (
    <>
      <TypingIndicator />
      <MessageComposer
        replyAuthor={replyTarget?.author.displayName ?? undefined}
        replyPreview={replyTarget?.message.markdown ?? undefined}
        onSend={onSend}
      />
    </>
  );
}
