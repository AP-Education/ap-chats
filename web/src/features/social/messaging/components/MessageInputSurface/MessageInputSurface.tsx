import type { PropsWithChildren, ReactNode } from 'react';

import styles from './MessageInputSurface.module.css';

interface MessageInputSurfaceProps extends PropsWithChildren {
  trailing?: ReactNode;
}

export function MessageInputSurface({ trailing, children }: MessageInputSurfaceProps) {
  return (
    <div className={styles.surface}>
      <div className={styles.line}>
        <div className={styles.body}>{children}</div>
        {trailing}
      </div>
    </div>
  );
}
