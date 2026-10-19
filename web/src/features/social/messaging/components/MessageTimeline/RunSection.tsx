import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { useTimelineActions } from '../../timeline-actions-context';
import { HistoryRun } from '../HistoryRun/HistoryRun';
import { HistoryEntry } from './HistoryEntry';
import styles from './RunSection.module.css';
import { runAvatar, sameRun, type TimelineRun } from './timeline-days';

interface RunSectionProps {
  run: TimelineRun;
}

/** One author's run, after the unread mark when the run starts what is new. */
export const RunSection = memo(
  function RunSection({ run }: RunSectionProps) {
    const { t } = useTranslation('messaging');
    const { viewer } = useTimelineActions();

    return (
      <>
        {run.unreadBefore && (
          <div className={styles.unread}>{t(($) => $.timeline.newMessages)}</div>
        )}
        <HistoryRun avatar={runAvatar(run, viewer.memberId)}>
          {run.entries.map(({ key, display }) => (
            <HistoryEntry key={key} {...display} />
          ))}
        </HistoryRun>
      </>
    );
  },
  (previous, next) => sameRun(previous.run, next.run),
);
