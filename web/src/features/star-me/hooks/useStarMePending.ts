import type { PendingEntry } from '@ap-education/timeline';
import { useMemo } from 'react';

import { useConversationScope } from '@/features/social/conversation-scope/store';
import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';

import { type AnswerEntry, answersOnTheirWay } from '../answers';
import { useQuestionStatuses } from './useQuestionStatuses';
import { useStarMe } from './useStarMe';

const NOTHING: PendingEntry<AnswerEntry>[] = [];

/** StarMe's answers on their way in this conversation, for its timeline to draw after the history. */
export function useStarMePending(
  landed: ReadonlySet<string>,
): readonly PendingEntry<AnswerEntry>[] {
  const { workspaceId } = useConversationScope();
  const starMe = useStarMe(workspaceId);
  const { currentMember } = useWorkspaceMemberLabels(workspaceId);
  const questions = useQuestionStatuses(landed);
  const viewerId = currentMember?.id;

  return useMemo(
    () => (starMe ? answersOnTheirWay(questions, starMe, viewerId) : NOTHING),
    [questions, starMe, viewerId],
  );
}
