import { MessageTimeline } from '@/features/social/messaging/components/MessageTimeline/MessageTimeline';
import type { useMessageOperations } from '@/features/social/messaging/hooks/useMessageOperations';
import { UnsentMessagesContext } from '@/features/social/messaging/unsent-messages-context';
import { peerReadSeqOf } from '@/features/social/read-receipts/read-receipts';
import { PeerReadContext } from '@/features/social/read-receipts/stores/peer-read-context';

import type { useConversationActions } from './useConversationActions';
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
  const { actions, actionContext, onAction, onEdit } = interaction;

  return (
    <UnsentMessagesContext.Provider value={operations}>
      <PeerReadContext.Provider value={peerReadSeqOf(pages)}>
        <MessageTimeline
          key={historyTargetId ?? 'unread'}
          pages={pages}
          displayItems={operations.displayItems}
          actionContext={actionContext}
          actions={actions}
          onAction={onAction}
          onJump={onJump}
          onEdit={onEdit}
          hasOlder={history.hasPreviousPage}
          hasNewer={history.hasNextPage}
          loadingOlder={history.isFetchingPreviousPage}
          loadingNewer={history.isFetchingNextPage}
          loadOlder={() => history.fetchPreviousPage()}
          loadNewer={() => history.fetchNextPage()}
          targetMessageId={targetMessageId}
        />
      </PeerReadContext.Provider>
    </UnsentMessagesContext.Provider>
  );
}
