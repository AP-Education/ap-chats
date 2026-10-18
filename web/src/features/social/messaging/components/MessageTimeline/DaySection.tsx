import { createStyles } from 'antd-style';
import { memo } from 'react';

import { RunSection } from './RunSection';
import { sameDay, type TimelineDay } from './timeline-days';

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
}));

interface DaySectionProps {
  day: TimelineDay;
  /** Given by the timeline, so a section that skips rendering still turns "Сьогодні" into "Вчора". */
  label: string;
}

/** One calendar day under its sticky date, as runs of one author each. */
export const DaySection = memo(
  function DaySection({ day, label }: DaySectionProps) {
    const { styles } = useStyles();

    return (
      <section className={styles.day} aria-label={label}>
        <div className={styles.dateBar} data-chat-inset>
          <span className={styles.pill}>{label}</span>
        </div>
        {day.runs.map((run) => (
          <RunSection key={run.key} run={run} />
        ))}
      </section>
    );
  },
  (previous, next) => previous.label === next.label && sameDay(previous.day, next.day),
);
