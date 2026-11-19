import { TimelineEntryRetry } from '@ap-education/timeline/react';
import { useTranslation } from 'react-i18next';

import type { AnswerFailure } from '../../types';
import styles from './StarMeFailureNote.module.css';

interface StarMeFailureNoteProps {
  failure: AnswerFailure;
  onRetry: () => void;
}

/** Why StarMe did not answer the person's question, told to them alone. */
export function StarMeFailureNote({ failure, onRetry }: StarMeFailureNoteProps) {
  const { t } = useTranslation('starMe');
  const canRetry = failure !== 'forbidden';

  return (
    <div className={styles.note}>
      <TimelineEntryRetry
        notice={<span className={styles.reason}>{t(($) => $.failures[failure])}</span>}
        onRetry={canRetry ? onRetry : undefined}
      />
    </div>
  );
}
