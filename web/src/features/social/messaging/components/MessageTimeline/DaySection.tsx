import { createStyles } from 'antd-style';
import { Fragment } from 'react';

import { useTimelineActions } from '../../timeline-actions-context';
import { HistoryRun } from '../HistoryRun/HistoryRun';
import { HistoryEntry } from './HistoryEntry';
import { formatDayLabel, runAvatar, type TimelineDay } from './timeline-days';

const useStyles = createStyles(({ token, css }) => ({
  day: css`
    display: flex;
    flex-direction: column;
  `,
  dateBar: css`
    position: sticky;
    top: calc(var(--chat-inset-top, 0px) + ${token.paddingXS}px);
    z-index: 2;
    display: flex;
    justify-content: center;
    margin-block: ${token.marginXS}px;
    pointer-events: none;
  `,
  pill: css`
    padding: ${token.paddingXXS}px ${token.paddingSM}px;
    border-radius: 999px;
    background: var(--chat-service-bg, rgba(0, 0, 0, 0.32));
    backdrop-filter: var(--glass-blur, blur(24px) saturate(1.5));
    color: ${token.colorWhite};
    font-size: ${token.fontSizeSM}px;
    line-height: ${token.lineHeight};
    font-weight: 600;
    white-space: nowrap;
  `,
  unread: css`
    margin: ${token.marginXS}px 0 ${token.marginSM}px;
    padding: ${token.paddingXXS}px 0;
    background: var(--chat-service-bg, rgba(0, 0, 0, 0.32));
    backdrop-filter: var(--glass-blur, blur(24px) saturate(1.5));
    color: ${token.colorWhite};
    font-size: ${token.fontSizeSM}px;
    line-height: ${token.lineHeight};
    font-weight: 650;
    text-align: center;
  `,
}));

/** One calendar day under its sticky date, as runs of one author each. */
export function DaySection({ day }: { day: TimelineDay }) {
  const { styles } = useStyles();
  const { viewer } = useTimelineActions();
  const label = formatDayLabel(day.date);

  return (
    <section className={styles.day} aria-label={label}>
      <div className={styles.dateBar}>
        <span className={styles.pill}>{label}</span>
      </div>
      {day.runs.map((run) => (
        <Fragment key={run.key}>
          {run.unreadBefore && <div className={styles.unread}>Нові повідомлення</div>}
          <HistoryRun avatar={runAvatar(run, viewer.memberId)}>
            {run.entries.map(({ key, display }) => (
              <HistoryEntry key={key} {...display} />
            ))}
          </HistoryRun>
        </Fragment>
      ))}
    </section>
  );
}
