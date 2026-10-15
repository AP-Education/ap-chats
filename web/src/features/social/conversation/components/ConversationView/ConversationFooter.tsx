import { type ReactNode, useState } from 'react';

import {
  useConversation,
  useConversationPermissions,
} from '@/features/social/conversation-scope/store';
import { MentionEditor } from '@/features/social/mentions/components/MentionEditor/MentionEditor';
import { MessageComposer } from '@/features/social/messaging/components/MessageComposer';
import type { useMessageOperations } from '@/features/social/messaging/hooks/useMessageOperations';
import type {
  HistoryItem,
  PendingAttachmentCommit,
  SendMessageCommand,
} from '@/features/social/messaging/types';
import { isMessageItem } from '@/features/social/messaging/types';
import { ScheduledMessagesEntry } from '@/features/social/scheduling/components/ScheduledMessagesEntry/ScheduledMessagesEntry';
import { ScheduleMessageDialog } from '@/features/social/scheduling/components/ScheduleMessageDialog/ScheduleMessageDialog';
import type { ScheduleRequest } from '@/features/social/scheduling/types';

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
  const intent = useConversation((state) => state.intent);
  const [scheduling, setScheduling] = useState<ScheduleRequest | null>(null);
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
    <>
      <MessageComposer
        replyAuthor={replyTarget?.author.displayName ?? undefined}
        replyPreview={replyTarget?.message.markdown ?? undefined}
        onSend={onSend}
        onSchedule={(input, onScheduled) => setScheduling({ input, onScheduled })}
        accessory={<ScheduledMessagesEntry />}
      >
        <MentionEditor />
      </MessageComposer>
      {scheduling && (
        <ScheduleMessageDialog request={scheduling} onClose={() => setScheduling(null)} />
      )}
    </>
  );
}
