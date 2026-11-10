import { TimelineEntryRetry } from '@ap-education/timeline/react';

import type { AnswerFailure } from '../../types';
import styles from './StarMeFailureNote.module.css';

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
  const canRetry = failure !== 'forbidden';

  return (
    <div className={styles.note}>
      <TimelineEntryRetry
        notice={<span className={styles.reason}>{FAILURE_TEXT[failure]}</span>}
        onRetry={canRetry ? onRetry : undefined}
      />
    </div>
  );
}
