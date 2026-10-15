import { createStyles } from 'antd-style';

import { BubbleRetry } from '@/features/social/messaging/components/Bubble/BubbleRetry';

import type { AnswerFailure } from '../../types';

const useStyles = createStyles(({ css }) => ({
  note: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
}));

const FAILURE_TEXT: Record<AnswerFailure, string> = {
  limited: 'Запитів до StarMe забагато. Спробуйте трохи згодом.',
  forbidden: 'StarMe недоступний для вашого облікового запису.',
  unavailable: 'StarMe зараз не відповідає.',
  failed: 'StarMe не зміг відповісти.',
};

interface StarMeFailureNoteProps {
  failure: AnswerFailure;
  onRetry: () => void;
}

/** Why StarMe did not answer the person's question, told to them alone. */
export function StarMeFailureNote({ failure, onRetry }: StarMeFailureNoteProps) {
  const { styles } = useStyles();
  const canRetry = failure !== 'forbidden';

  return (
    <div className={styles.note}>
      {FAILURE_TEXT[failure]}
      <BubbleRetry status="Бачите лише ви" onRetry={canRetry ? onRetry : undefined} />
    </div>
  );
}
