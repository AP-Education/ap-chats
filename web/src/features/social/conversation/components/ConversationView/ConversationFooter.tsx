import type { ReactNode } from 'react';

import { useConversation } from '@/features/social/conversation-scope/store';
import { MentionEditor } from '@/features/social/mentions/components/MentionEditor/MentionEditor';
import { MessageComposer } from '@/features/social/messaging/components/MessageComposer';
import type { useMessageOperations } from '@/features/social/messaging/hooks/useMessageOperations';
import type {
  HistoryItem,
  PendingAttachmentCommit,
  SendMessageCommand,
} from '@/features/social/messaging/types';
import { isMessageItem } from '@/features/social/messaging/types';

interface ConversationFooterProps {
  canPost: boolean;
  readOnlyFooter?: ReactNode;
  items: HistoryItem[];
  send: ReturnType<typeof useMessageOperations>['send'];
}

export function ConversationFooter({
  canPost,
  readOnlyFooter,
  items,
  send,
}: ConversationFooterProps) {
  if (!canPost) return <>{readOnlyFooter}</>;

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

  function onSend(
    input: Omit<SendMessageCommand, 'clientNonce' | 'attachments'>,
    pending?: PendingAttachmentCommit,
  ) {
    send(input, pending);
  }

  return (
    <MessageComposer
      replyAuthor={replyTarget?.author.displayName ?? undefined}
      replyPreview={replyTarget?.message.markdown ?? undefined}
      onSend={onSend}
    >
      <MentionEditor />
    </MessageComposer>
  );
}
