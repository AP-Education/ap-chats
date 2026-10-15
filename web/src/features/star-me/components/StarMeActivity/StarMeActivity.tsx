import { AiText } from '@ap-education/ui';
import { createStyles, keyframes } from 'antd-style';
import type { PropsWithChildren } from 'react';

import { useConversationScope } from '@/features/social/conversation-scope/store';
import { Bubble } from '@/features/social/messaging/components/Bubble/Bubble';
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
      <ActivityRow starMe={starMe} role="status">
        <Bubble own={false}>
          <AiText thinking>Думаю над відповіддю</AiText>
        </Bubble>
      </ActivityRow>
    );
  }

  const failed = lastFailure(statuses, currentMember?.id);
  if (!failed) return null;

  return (
    <ActivityRow starMe={starMe} role="alert">
      <Bubble own={false} tone="failed">
        <StarMeFailureNote
          failure={failed.failure}
          onRetry={() => ask({ channelId, questionId: failed.questionId })}
        />
      </Bubble>
    </ActivityRow>
  );
}

interface ActivityRowProps {
  starMe: MemberSummary;
  role: 'status' | 'alert';
}

function ActivityRow({ starMe, role, children }: PropsWithChildren<ActivityRowProps>) {
  const { styles } = useStyles();

  return (
    <div className={styles.activity} role={role}>
      <HistoryRun avatar={starMe}>{children}</HistoryRun>
    </div>
  );
}
