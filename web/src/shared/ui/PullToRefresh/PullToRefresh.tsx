import { ArrowClockwiseIcon, CircleNotchIcon } from '@phosphor-icons/react';
import { createStyles, keyframes } from 'antd-style';
import { type PropsWithChildren, useRef } from 'react';

import { usePullToRefresh } from './usePullToRefresh';

const spin = keyframes`
  to { rotate: 1turn; }
`;

const SETTLE = '240ms cubic-bezier(0.22, 0.61, 0.36, 1)';
const INDICATOR_SIZE = 36;

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    position: relative;
    height: 100%;
  `,
  // The list itself moves, never re-lays out: the spinner takes the room the pull opens above it.
  content: css`
    height: 100%;
    transform: translateY(var(--pull-offset, 0px));
    transition: transform ${SETTLE};

    [data-pulling] > & {
      transition: none;
    }
  `,
  indicator: css`
    position: absolute;
    top: 0;
    left: 50%;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${INDICATOR_SIZE}px;
    height: ${INDICATOR_SIZE}px;
    border-radius: 50%;
    background: ${token.colorBgElevated};
    box-shadow: ${token.boxShadowSecondary};
    color: ${token.colorPrimary};
    opacity: var(--pull-progress, 0);
    transform: translate(-50%, calc(var(--pull-offset, 0px) - ${INDICATOR_SIZE + 8}px));
    transition:
      transform ${SETTLE},
      opacity ${SETTLE};
    pointer-events: none;

    [data-pulling] > & {
      transition: none;
    }
  `,
  // While pulling, the arrow winds up with the pull; past the trigger it has turned all the way.
  arrow: css`
    rotate: calc(var(--pull-progress, 0) * 270deg);
  `,
  spinner: css`
    animation: ${spin} 0.8s linear infinite;
  `,
  refreshing: css`
    opacity: 1;
  `,
}));

interface PullToRefreshProps extends PropsWithChildren {
  onRefresh: () => Promise<unknown>;
}

/** Refreshes a list pulled down from its top, the way phone apps do, keeping what it shows meanwhile. */
export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const { styles, cx } = useStyles();
  const rootRef = useRef<HTMLDivElement>(null);
  const { armed, refreshing } = usePullToRefresh(rootRef, onRefresh);

  return (
    <div ref={rootRef} className={styles.root}>
      <div
        className={cx(styles.indicator, refreshing && styles.refreshing)}
        role="status"
        aria-label={refreshing ? 'Оновлення' : undefined}
      >
        {refreshing ? (
          <CircleNotchIcon size={20} weight="bold" className={styles.spinner} />
        ) : (
          <ArrowClockwiseIcon
            size={20}
            weight={armed ? 'bold' : 'regular'}
            className={styles.arrow}
          />
        )}
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
