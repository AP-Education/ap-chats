import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';

import type { MessageAuthor } from '../../types';
import { RunAvatar } from './RunAvatar';

const useStyles = createStyles(({ token, css }) => ({
  run: css`
    display: flex;
    align-items: flex-end;
    gap: ${token.paddingXXS}px;
    padding-inline: ${token.paddingXS}px;

    & + & {
      margin-top: ${token.marginXS}px;
    }
  `,
  // Rides along the bottom of the viewport while a long run scrolls past.
  avatar: css`
    position: sticky;
    bottom: calc(var(--chat-inset-bottom, 0px) + ${token.paddingXXS}px);
    display: inline-flex;
    flex-shrink: 0;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 2px;
    }
  `,
  // Each row learns its place in the run: inner joints round less, only the first
  // bubble names the author and only the last one carries the tail.
  entries: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    & > :not(:first-child) {
      --run-top-radius: ${token.borderRadiusSM}px;
      --run-author: none;
    }

    & > :not(:last-child) {
      --run-bottom-radius: ${token.borderRadiusSM}px;
      --run-tail: none;
    }
  `,
}));

interface HistoryRunProps {
  /** The face beside an incoming run; own runs and standalone events have none. */
  avatar: MessageAuthor | null;
  children: ReactNode;
}

export function HistoryRun({ avatar, children }: HistoryRunProps) {
  const { styles, theme } = useStyles();

  return (
    <div className={styles.run}>
      {avatar && (
        <RunAvatar author={avatar} size={theme.controlHeightLG} className={styles.avatar} />
      )}
      <div className={styles.entries}>{children}</div>
    </div>
  );
}
