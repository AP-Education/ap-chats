import { type DayFrameProps, TimelineEntrySystem } from '@ap-education/timeline/react';
import { createStyles } from 'antd-style';

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
    transition: opacity ${token.motionDurationMid} ${token.motionEaseOut};

    // Stuck over the messages, the date shows only while they move (see useFloatingDates).
    &[data-stuck] {
      opacity: 0;
    }

    [data-scrolling] &[data-stuck] {
      opacity: 1;
    }
  `,
}));

/** One calendar day under its sticky date; the timeline package memoizes it and fills its runs.
 * The date floats over the messages only while they scroll (see useFloatingDates). */
export function DaySection({ label, children }: DayFrameProps) {
  const { styles } = useStyles();

  return (
    <section className={styles.day} aria-label={label}>
      <div className={styles.dateBar} data-chat-inset data-day-bar>
        <TimelineEntrySystem>{label}</TimelineEntrySystem>
      </div>
      {children}
    </section>
  );
}
