import { useMemo } from 'react';

import { MessageTimeline } from '@/features/social/messaging/components/MessageTimeline/MessageTimeline';
import type { useMessageOperations } from '@/features/social/messaging/hooks/useMessageOperations';
import { UnsentMessagesContext } from '@/features/social/messaging/sending/stores/unsent-messages-context';
import {
  type TimelineActions,
  TimelineActionsContext,
} from '@/features/social/messaging/timeline-actions-context';
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
  const { history, targetMessageId, historyTargetId, onJump } = navigation;
  const { actions, actionContext, onAction, onEdit } = interaction;
  // Stable, so every memoised row keeps skipping renders that only touch other rows.
  const timelineActions = useMemo<TimelineActions>(
    () => ({ viewer: actionContext, actions, run: onAction, jumpTo: onJump, saveEdit: onEdit }),
    [actionContext, actions, onAction, onJump, onEdit],
  );

  return (
    <TimelineActionsContext.Provider value={timelineActions}>
      <UnsentMessagesContext.Provider value={operations.unsent}>
        <PeerReadContext.Provider value={history.meta?.peerReadSeq ?? null}>
          <MessageTimeline
            key={historyTargetId ?? 'unread'}
            view={history}
            pending={operations.pending}
            targetMessageId={targetMessageId}
          />
        </PeerReadContext.Provider>
      </UnsentMessagesContext.Provider>
    </TimelineActionsContext.Provider>
  );
}
