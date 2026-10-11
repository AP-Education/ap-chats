import { useMemo } from 'react';
import { createPortal } from 'react-dom';

import {
  type ConversationContribution,
  useConversationContribution,
  useConversationTimelineEnd,
} from '@/features/social/conversation/contributions';
import { useConversation, useConversationScope } from '@/features/social/conversation/store';
import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';
import type { MemberSummary, WorkspaceMember } from '@/features/workspaces/types';

import { askStarMeAction } from '../actions';
import { useStarMe } from '../hooks/useStarMe';
import { useStarMeAnswers } from '../hooks/useStarMeAnswers';
import { StarMeActivity } from './StarMeActivity/StarMeActivity';
import { StarMeQuestionContext } from './StarMeQuestionContext/StarMeQuestionContext';

/** StarMe in the conversation it is mounted in, while the workspace has StarMe. */
export function StarMeConversation() {
  const { workspaceId } = useConversationScope();
  const starMe = useStarMe(workspaceId);
  const { currentMember } = useWorkspaceMemberLabels(workspaceId);

  if (!starMe) return null;
  return <PresentStarMe starMe={starMe} currentMemberId={currentMember?.id} />;
}

interface PresentStarMeProps {
  starMe: WorkspaceMember;
  currentMemberId: string | undefined;
}

// Answers whatever is said to it once it lands, offers to read picked messages, and shows
// what it is doing.
function PresentStarMe({ starMe, currentMemberId }: PresentStarMeProps) {
  const setIntent = useConversation((state) => state.setIntent);
  const clearSelection = useConversation((state) => state.clearSelection);
  const timelineEnd = useConversationTimelineEnd();
  const { request, thinking, failure } = useStarMeAnswers(currentMemberId);
  const member = useMemo<MemberSummary>(
    () => ({
      memberId: starMe.id,
      displayName: starMe.profile.displayName,
      avatarPath: starMe.profile.avatarPath,
      isBot: starMe.profile.isBot,
    }),
    [starMe],
  );

  const contribution = useMemo<ConversationContribution>(() => {
    const mention = `:member[${starMe.id}]`;

    return {
      actions: [
        askStarMeAction((items) => {
          setIntent({ kind: 'ask', member, messageIds: items.map((item) => item.message.id) });
          clearSelection();
        }),
      ],
      MessageAddon: StarMeQuestionContext,
      sent: ({ input, picked, replyToAuthorId }, landed) => {
        const addressed =
          picked !== undefined || replyToAuthorId === starMe.id || input.markdown.includes(mention);
        if (!addressed) return;

        void landed.then((question) =>
          request(
            picked
              ? { questionId: question.id, contextMessageIds: picked }
              : { questionId: question.id },
          ),
        );
      },
    };
  }, [starMe, member, setIntent, clearSelection, request]);
  useConversationContribution(contribution);

  if (!timelineEnd) return null;
  return createPortal(
    <StarMeActivity starMe={member} thinking={thinking} failure={failure} />,
    timelineEnd,
  );
}
