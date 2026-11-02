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
  `,
}));

/** One calendar day under its sticky date; the timeline package memoizes it and fills its runs. */
export function DaySection({ label, children }: DayFrameProps) {
  const { styles } = useStyles();

  return (
    <section className={styles.day} aria-label={label}>
      <div className={styles.dateBar} data-chat-inset>
        <TimelineEntrySystem>{label}</TimelineEntrySystem>
      </div>
      {children}
    </section>
  );
}
