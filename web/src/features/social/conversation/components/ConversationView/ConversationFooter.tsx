import type { ReactNode } from 'react';

import { useConversationExtensions } from '@/features/social/conversation-scope/extensions';
import {
  useConversation,
  useConversationPermissions,
  useConversationScope,
} from '@/features/social/conversation-scope/store';
import { MentionEditor } from '@/features/social/mentions/components/MentionEditor/MentionEditor';
import { MessageComposer } from '@/features/social/messaging/components/MessageComposer';
import type { useMessageOperations } from '@/features/social/messaging/hooks/useMessageOperations';
import type { ComposedMessage, HistoryItem } from '@/features/social/messaging/types';
import { isMessageItem } from '@/features/social/messaging/types';

interface ConversationFooterProps {
  readOnlyFooter?: ReactNode;
  items: HistoryItem[];
  send: ReturnType<typeof useMessageOperations>['send'];
}

export function ConversationFooter({ readOnlyFooter, items, send }: ConversationFooterProps) {
  const { canPost } = useConversationPermissions();
  if (!canPost) return <>{readOnlyFooter}</>;

  return <WritableConversationFooter items={items} send={send} />;
}

function WritableConversationFooter({
  items,
  send,
}: Pick<ConversationFooterProps, 'items' | 'send'>) {
  const { channelId } = useConversationScope();
  const intent = useConversation((state) => state.intent);
  const extensions = useConversationExtensions();
  const replyTarget =
    intent?.kind === 'reply'
      ? items.filter(isMessageItem).find((item) => item.message.id === intent.messageId)
      : undefined;

  function onSend(input: ComposedMessage, nonce: string) {
    const sent = {
      channelId,
      input,
      landed: send(input, nonce),
      ...(intent?.kind === 'ask' ? { picked: intent.messageIds } : {}),
      ...(replyTarget ? { replyToAuthorId: replyTarget.author.memberId } : {}),
    };
    extensions.forEach((extension) => extension.sent?.(sent));
  }

  return (
    <MessageComposer
      replyAuthor={replyTarget?.author.displayName ?? undefined}
      replyPreview={replyTarget?.message}
      onSend={onSend}
    >
      <MentionEditor />
    </MessageComposer>
  );
}
