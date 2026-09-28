import { MessageTimeline } from '@/features/social/messaging/components/MessageTimeline/MessageTimeline';
import type { useMessageOperations } from '@/features/social/messaging/hooks/useMessageOperations';
import type { MessageAuthor } from '@/features/social/messaging/types';

import { useConversationScope } from '../../store';
import type { useConversationActions } from './useConversationActions';
import { conversationActions } from './useConversationActions';
import type { useConversationHistoryNavigation } from './useConversationHistoryNavigation';

interface ConversationTimelineProps {
  author: MessageAuthor;
  navigation: ReturnType<typeof useConversationHistoryNavigation>;
  interaction: ReturnType<typeof useConversationActions>;
  operations: ReturnType<typeof useMessageOperations>;
}

export function ConversationTimeline({
  author,
  navigation,
  interaction,
  operations,
}: ConversationTimelineProps) {
  const { workspaceId, channelId } = useConversationScope();
  const { history, pages, historyTargetId, targetMessageId, onJump } = navigation;
  const { actionContext, onAction, onEdit } = interaction;

  return (
    <MessageTimeline
      key={historyTargetId ?? 'unread'}
      workspaceId={workspaceId}
      channelId={channelId}
      pages={pages}
      outbox={operations.outbox}
      author={author}
      actionContext={actionContext}
      actions={conversationActions}
      onAction={onAction}
      onJump={onJump}
      onEdit={onEdit}
      onRetry={(nonce) => void operations.retry(nonce)?.catch(() => undefined)}
      hasOlder={history.hasPreviousPage}
      hasNewer={history.hasNextPage}
      loadingOlder={history.isFetchingPreviousPage}
      loadingNewer={history.isFetchingNextPage}
      loadOlder={() => history.fetchPreviousPage()}
      loadNewer={() => history.fetchNextPage()}
      targetMessageId={targetMessageId}
    />
  );
}
