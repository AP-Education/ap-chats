import { CaretDownIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

import { CallActionButton } from '../CallActionButton/CallActionButton';

const useStyles = createStyles(({ token, css }) => ({
  header: css`
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    padding: calc(20px + env(safe-area-inset-top, 0px)) 72px 0;
    text-align: center;

    // Over video the header floats on a scrim instead of taking its own row.
    [data-cinema] > & {
      position: absolute;
      inset: 0 0 auto;
      z-index: 2;
      padding-top: calc(14px + env(safe-area-inset-top, 0px));
      padding-bottom: 28px;
      background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6), transparent);
    }
  `,
  // Left, not right: a dismiss/collapse action reads as "back" and belongs
  // on the leading edge, the same convention iOS sheets and most call UIs
  // follow — the right side is reserved for forward actions.
  minimize: css`
    position: absolute;
    top: calc(16px + env(safe-area-inset-top, 0px));
    left: 16px;
  `,
  // Named to match MiniCallBar's own title/duration: minimizing or restoring
  // morphs one into the other via the browser's View Transitions API
  // (withViewTransition, called where minimize/restore are triggered)
  // instead of an instant swap.
  title: css`
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: ${token.fontSizeLG}px;
    font-weight: 600;
    view-transition-name: active-call-title;
  `,
  duration: css`
    min-height: 20px;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
    font-variant-numeric: tabular-nums;
    view-transition-name: active-call-duration;
  `,
}));

interface CallHeaderProps {
  title: string;
  duration: string;
  onMinimize: () => void;
}

export function CallHeader({ title, duration, onMinimize }: CallHeaderProps) {
  const { styles } = useStyles();

  return (
    <header className={styles.header}>
      <CallActionButton
        size={40}
        className={styles.minimize}
        aria-label="Згорнути дзвінок"
        onClick={onMinimize}
      >
        <CaretDownIcon size={20} />
      </CallActionButton>
      <span className={styles.title}>{title}</span>
      <span className={styles.duration}>{duration}</span>
    </header>
  );
}
