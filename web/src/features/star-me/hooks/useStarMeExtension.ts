import { defineEntryKind } from '@ap-education/timeline/react';
import { useMemo } from 'react';

import type { ConversationExtension } from '@/features/social/conversation-scope/extensions';
import type { ConversationEntry } from '@/features/social/messaging/timeline/chat-entry';

import { askStarMeAction } from '../actions';
import { type AnswerEntry, STAR_ME_ANSWER } from '../answers';
import { StarMeAnswer } from '../components/StarMeAnswer/StarMeAnswer';
import { StarMeQuestionContext } from '../components/StarMeQuestionContext/StarMeQuestionContext';
import { askRequest, asksStarMe } from '../questions';
import { useAskStarMe } from './useAskStarMe';
import { useStarMe } from './useStarMe';
import { useStarMePending } from './useStarMePending';

// Named beside the conversation's entries, so its view is typed by StarMe's own. It keeps a run of
// its own, as the answer always stood apart below the history, so it never regroups while it waits.
const answerKind = defineEntryKind<ConversationEntry | AnswerEntry, typeof STAR_ME_ANSWER>({
  kind: STAR_ME_ANSWER,
  view: StarMeAnswer,
  joinsRun: false,
});

/** StarMe in the workspace's channel conversations: asked from messages, answering below them. */
export function useStarMeExtension(workspaceId: string): ConversationExtension | undefined {
  const starMe = useStarMe(workspaceId);
  const ask = useAskStarMe(workspaceId);

  return useMemo(() => {
    if (!starMe) return undefined;

    return {
      id: 'star-me',
      actions: [askStarMeAction(starMe)],
      MessageAddon: StarMeQuestionContext,
      kinds: [answerKind],
      usePending: useStarMePending,
      sent: (message) => {
        if (!asksStarMe(message, starMe.memberId)) return;
        void message.landed.then((question) => ask(askRequest(message, question.id)));
      },
    };
  }, [starMe, ask]);
}
