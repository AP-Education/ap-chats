import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { useConversationScope } from '@/features/social/conversation/store';

import type { ReactionChangedPayload } from '../types';
import { useReactionCache } from './useReactionCache';

type ReactionServerToClientEvents = {
  'social:reaction': (payload: ReactionChangedPayload) => void;
};

/** Applies reactions from others and from the viewer's other devices as they happen. */
export function useReactionEvents(viewerMemberId: string | undefined) {
  const { workspaceId, channelId } = useConversationScope();
  const applyChange = useReactionCache();

  useSocketEvent<ReactionServerToClientEvents>('social:reaction', (event) => {
    const inThisConversation = event.workspaceId === workspaceId && event.channelId === channelId;
    if (!inThisConversation) return;

    const byViewer = event.actorMemberId === viewerMemberId;
    applyChange(event.messageId, {
      ...event.reaction,
      reacted: byViewer ? event.added : undefined,
    });
  });
}
