import { useMemo } from 'react';

import type { ConversationExtension } from '@/features/social/conversation-scope/extensions';

import { askStarMeAction } from '../actions';
import { StarMeActivity } from '../components/StarMeActivity/StarMeActivity';
import { askRequest, asksStarMe } from '../questions';
import { useAskStarMe } from './useAskStarMe';
import { useStarMe } from './useStarMe';

/** StarMe in the workspace's channel conversations: asked from messages, answering below them. */
export function useStarMeExtension(workspaceId: string): ConversationExtension | undefined {
  const starMe = useStarMe(workspaceId);
  const ask = useAskStarMe(workspaceId);

  return useMemo(() => {
    if (!starMe) return undefined;

    return {
      id: 'star-me',
      actions: [askStarMeAction(starMe)],
      TimelineEnd: StarMeActivity,
      sent: (message) => {
        if (!asksStarMe(message, starMe.memberId)) return;
        void message.landed.then((question) => ask(askRequest(message, question.id)));
      },
    };
  }, [starMe, ask]);
}
