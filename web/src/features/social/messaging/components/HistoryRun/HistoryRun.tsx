import { theme } from 'antd';
import type { ReactNode } from 'react';

import type { MemberSummary } from '@/features/workspaces/types';

import styles from './HistoryRun.module.css';
import { RunAvatar } from './RunAvatar';

interface HistoryRunProps {
  /** The face beside an incoming run; own runs and standalone events have none. */
  avatar: MemberSummary | null;
  children: ReactNode;
}

export function HistoryRun({ avatar, children }: HistoryRunProps) {
  const { token } = theme.useToken();

  return (
    <div className={styles.run} data-history-run data-has-avatar={avatar ? true : undefined}>
      {avatar && (
        <RunAvatar author={avatar} size={token.controlHeightLG} className={styles.avatar} />
      )}
      <div className={styles.entries} data-run-entries>
        {children}
      </div>
    </div>
  );
}
