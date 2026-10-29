import { useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { useConversationScope } from '@/features/social/conversation-scope/store';
import { messagingQueryKeys } from '@/features/social/messaging/queryKeys';
import type { ChatTimelineData } from '@/features/social/messaging/timeline/chat-entry';

import { withPeerRead } from '../read-receipts';
import type { ReadReceipt } from '../types';

type ReadReceiptServerToClientEvents = {
  'social:read-receipt': (payload: ReadReceipt) => void;
};

/** Moves the read marks on as the others in the open conversation read. */
export function useReadReceiptEvents(viewerMemberId: string | undefined) {
  const { workspaceId, channelId } = useConversationScope();
  const { identity } = useQueryAuth();
  const queryClient = useQueryClient();

  useSocketEvent<ReadReceiptServerToClientEvents>('social:read-receipt', (receipt) => {
    const inThisConversation =
      receipt.workspaceId === workspaceId && receipt.channelId === channelId;
    const byViewer = receipt.memberId === viewerMemberId;
    if (!inThisConversation || byViewer) return;

    queryClient.setQueriesData<ChatTimelineData>(
      { queryKey: messagingQueryKeys.histories(identity, workspaceId, channelId) },
      (history) => history && withPeerRead(history, receipt.seq),
    );
  });
}
