import type { ReactNode } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { MessageComposer } from '@/features/social/messaging/components/MessageComposer';
import type { useMessageOperations } from '@/features/social/messaging/hooks/useMessageOperations';
import type { HistoryItem, SendMessageInput } from '@/features/social/messaging/types';
import { isMessageItem } from '@/features/social/messaging/types';

import { useConversation, useConversationScope } from '../../store';

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
  const { workspaceId, channelId } = useConversationScope();
  const { identity } = useQueryAuth();
  const replyTarget = intent
    ? items.filter(isMessageItem).find((item) => item.message.id === intent.messageId)
    : undefined;

  function onSend(input: Omit<SendMessageInput, 'clientNonce'>) {
    send(input);
  }

  return (
    <MessageComposer
      key={`${identity}:${workspaceId}:${channelId}`}
      replyAuthor={replyTarget?.author.displayName ?? undefined}
      replyPreview={replyTarget?.message.markdown ?? undefined}
      onSend={onSend}
    />
  );
}
