import { useMemo } from 'react';

import type { ConversationExtension } from '@/features/social/conversation-scope/extensions';

import { askStarMeAction, makeStarMeAnswerOwnAction } from '../actions';
import { StarMeActivity } from '../components/StarMeActivity/StarMeActivity';
import { askRequest, asksStarMe } from '../questions';
import { useAskStarMe } from './useAskStarMe';
import { useStarMe } from './useStarMe';

/** StarMe in a channel or human DM, summoned by a mention or reply to its answer. */
export function useStarMeExtension(workspaceId: string): ConversationExtension | undefined {
  const starMe = useStarMe(workspaceId);
  const ask = useAskStarMe(workspaceId);

  return useMemo(() => {
    if (!starMe) return undefined;

    return {
      id: 'star-me',
      privateAssistantMemberId: starMe.memberId,
      actions: [askStarMeAction(starMe), makeStarMeAnswerOwnAction],
      TimelineEnd: StarMeActivity,
      sent: (message) => {
        if (!asksStarMe(message, starMe.memberId)) return;
        void message.landed
          .then((question) => ask(askRequest(message, question.id)))
          .catch(() => {});
      },
    };
  }, [starMe, ask]);
}
