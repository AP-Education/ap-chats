import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import { BubbleRetry } from '@/features/social/messaging/components/Bubble/BubbleRetry';

import type { AnswerFailure } from '../../types';

const useStyles = createStyles(({ css }) => ({
  note: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
}));

interface StarMeFailureNoteProps {
  failure: AnswerFailure;
  onRetry: () => void;
}

/** Why StarMe did not answer the person's question, told to them alone. */
export function StarMeFailureNote({ failure, onRetry }: StarMeFailureNoteProps) {
  const { styles } = useStyles();
  const { t } = useTranslation('starMe');
  const canRetry = failure !== 'forbidden';

  return (
    <div className={styles.note}>
      {t(($) => $.failures[failure])}
      <BubbleRetry status={t(($) => $.visibleOnlyToYou)} onRetry={canRetry ? onRetry : undefined} />
    </div>
  );
}
