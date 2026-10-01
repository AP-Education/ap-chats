import { MessageTimeline } from '@/features/social/messaging/components/MessageTimeline/MessageTimeline';
import type { useMessageOperations } from '@/features/social/messaging/hooks/useMessageOperations';

import type { useConversationActions } from './useConversationActions';
import { conversationActions } from './useConversationActions';
import type { useConversationHistoryNavigation } from './useConversationHistoryNavigation';

interface ConversationTimelineProps {
  navigation: ReturnType<typeof useConversationHistoryNavigation>;
  interaction: ReturnType<typeof useConversationActions>;
  operations: ReturnType<typeof useMessageOperations>;
}

export function ConversationTimeline({
  navigation,
  interaction,
  operations,
}: ConversationTimelineProps) {
  const { history, pages, historyTargetId, targetMessageId, onJump } = navigation;
  const { actionContext, onAction, onEdit } = interaction;

  return (
    <MessageTimeline
      key={historyTargetId ?? 'unread'}
      pages={pages}
      displayItems={operations.displayItems}
      actionContext={actionContext}
      actions={conversationActions}
      onAction={onAction}
      onJump={onJump}
      onEdit={onEdit}
      onRetry={operations.retry}
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
