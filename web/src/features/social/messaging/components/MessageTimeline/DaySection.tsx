import type { DayFrameProps } from '@ap-education/timeline/react';
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

/** One calendar day under its sticky date; the timeline package memoizes it and fills its runs. */
export function DaySection({ label, children }: DayFrameProps) {
  const { styles } = useStyles();

  return (
    <section className={styles.day} aria-label={label}>
      <div className={styles.dateBar} data-chat-inset>
        <span className={styles.pill}>{label}</span>
      </div>
      {children}
    </section>
  );
}
