import type { PropsWithChildren, ReactNode } from 'react';

import styles from './MessageInputSurface.module.css';

interface MessageInputSurfaceProps extends PropsWithChildren {
  context?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  compact?: boolean;
}

export function MessageInputSurface({
  context,
  leading,
  trailing,
  compact = false,
  children,
}: MessageInputSurfaceProps) {
  return (
    <div className={styles.surface} data-compact={compact || undefined}>
      {context && <div className={styles.context}>{context}</div>}
      <div className={styles.line}>
        {leading}
        <div className={styles.body}>{children}</div>
        {trailing}
      </div>
    </div>
  );
}
