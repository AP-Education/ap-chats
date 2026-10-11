import { AiText } from '@ap-education/ui';
import { createStyles, keyframes } from 'antd-style';

import { Bubble } from '@/features/social/messaging/components/Bubble/Bubble';
import { HistoryRun } from '@/features/social/messaging/components/HistoryRun/HistoryRun';
import type { MemberSummary } from '@/features/workspaces/types';

import type { StarMeFailure } from '../../hooks/useStarMeAnswers';
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

interface StarMeActivityProps {
  starMe: MemberSummary;
  thinking: boolean;
  failure: StarMeFailure | null;
}

/** StarMe at the end of the conversation, where its answer will land: composing, or why not. */
export function StarMeActivity({ starMe, thinking, failure }: StarMeActivityProps) {
  const { styles } = useStyles();
  const bubble = activityBubble(thinking, failure);
  if (!bubble) return null;

  return (
    <div className={styles.activity} role={thinking ? 'status' : 'alert'}>
      <HistoryRun avatar={starMe}>{bubble}</HistoryRun>
    </div>
  );
}

function activityBubble(thinking: boolean, failure: StarMeFailure | null) {
  if (thinking) {
    return (
      <Bubble own={false}>
        <AiText thinking>Думаю над відповіддю</AiText>
      </Bubble>
    );
  }
  if (!failure) return null;

  return (
    <Bubble own={false} tone="failed">
      <StarMeFailureNote failure={failure} />
    </Bubble>
  );
}
