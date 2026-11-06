import { useMemo } from 'react';

import type { ConversationExtension } from '@/features/social/conversation-scope/extensions';

import { askStarMeAction } from '../actions';
import { StarMeActivity } from '../components/StarMeActivity/StarMeActivity';
import { askRequest, asksStarMe } from '../questions';
import { useAskStarMe } from './useAskStarMe';
import { useStarMe } from './useStarMe';

/** StarMe in the workspace's channel conversations: asked from messages, answering below them. */
export function useStarMeExtension(
  workspaceId: string,
  directMemberId?: string,
): ConversationExtension | undefined {
  const starMe = useStarMe(workspaceId);
  const ask = useAskStarMe(workspaceId);

  return useMemo(() => {
    if (!starMe) return undefined;
    if (directMemberId && directMemberId !== starMe.memberId) return undefined;
    const direct = directMemberId === starMe.memberId;

    return {
      id: 'star-me',
      actions: direct ? [] : [askStarMeAction(starMe)],
      TimelineEnd: StarMeActivity,
      sent: (message) => {
        if (!asksStarMe(message, starMe.memberId, direct)) return;
        void message.landed
          .then((question) => ask(askRequest(message, question.id)))
          .catch(() => {});
      },
    };
  }, [starMe, ask, directMemberId]);
}
