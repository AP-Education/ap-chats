import type { PendingStatus, TimelineEntry as Entry } from '@ap-education/timeline';
import {
  createRegistry,
  defineEntryKind,
  type EntryViewProps,
  TimelineEntry,
  TimelineEntryBubble,
} from '@ap-education/timeline/react';
import { AiText } from '@ap-education/ui';
import { createStyles, keyframes } from 'antd-style';
import type { PropsWithChildren, ReactNode } from 'react';

import { useConversationScope } from '@/features/social/conversation-scope/store';
import { HistoryRun } from '@/features/social/messaging/components/HistoryRun/HistoryRun';
import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';
import type { MemberSummary } from '@/features/workspaces/types';

import { useAskStarMe } from '../../hooks/useAskStarMe';
import { useQuestionStatuses } from '../../hooks/useQuestionStatuses';
import { useStarMe } from '../../hooks/useStarMe';
import { isThinking, lastFailure } from '../../questions';
import { StarMeFailureNote } from './StarMeFailureNote';

const arrive = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
`;

const useStyles = createStyles(({ token, css }) => ({
  activity: css`
    margin-top: ${token.marginXS}px;
    animation: ${arrive} 200ms cubic-bezier(0.22, 0.61, 0.36, 1);

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `,
}));

/** StarMe at the end of the conversation, where its answer will land: composing, or why not. */
export function StarMeActivity() {
  const { workspaceId, channelId } = useConversationScope();
  const starMe = useStarMe(workspaceId);
  const { currentMember } = useWorkspaceMemberLabels(workspaceId);
  const statuses = useQuestionStatuses();
  const ask = useAskStarMe(workspaceId);

  if (!starMe) return null;
  if (statuses.some(isThinking)) {
    return (
      <ActivityRow starMe={starMe} role="status" status="sending">
        <AiText thinking>Думаю над відповіддю</AiText>
      </ActivityRow>
    );
  }

  const failed = lastFailure(statuses, currentMember?.id);
  if (!failed) return null;

  return (
    <ActivityRow starMe={starMe} role="alert" status="failed">
      <StarMeFailureNote
        failure={failed.failure}
        onRetry={() => ask({ channelId, questionId: failed.questionId })}
      />
    </ActivityRow>
  );
}

interface ActivityRowProps {
  starMe: MemberSummary;
  role: 'status' | 'alert';
  /** On its way while StarMe thinks; failed once it could not answer. */
  status: PendingStatus;
}

function ActivityRow({ starMe, role, status, children }: PropsWithChildren<ActivityRowProps>) {
  const { styles } = useStyles();
  const answer: StarMeAnswer = {
    key: STAR_ME_ANSWER,
    position: '',
    kind: STAR_ME_ANSWER,
    at: '',
    payload: { content: children },
  };

  return (
    <div className={styles.activity} role={role}>
      <HistoryRun avatar={starMe}>
        {starMeAnswers.render({
          entry: answer,
          status,
          anchor: { 'data-timeline-key': STAR_ME_ANSWER },
        })}
      </HistoryRun>
    </div>
  );
}

// The answer is not in the history yet, while the timeline package's bubble reads its entry from a
// view; so it is drawn through a registry of its own, as the coming answer it stands for.
const STAR_ME_ANSWER = 'STAR_ME_ANSWER';

type StarMeAnswer = Entry<typeof STAR_ME_ANSWER, { content: ReactNode }>;

function AnswerBubble({ entry }: EntryViewProps<StarMeAnswer>) {
  return (
    <TimelineEntry side="start">
      <TimelineEntryBubble>{entry.payload.content}</TimelineEntryBubble>
    </TimelineEntry>
  );
}

const starMeAnswers = createRegistry<StarMeAnswer>([
  defineEntryKind<StarMeAnswer, typeof STAR_ME_ANSWER>({
    kind: STAR_ME_ANSWER,
    view: AnswerBubble,
  }),
]);
