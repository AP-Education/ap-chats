import type { ReactNode } from 'react';

import styles from './BubbleExcerpt.module.css';

interface BubbleExcerptProps {
  onClick: () => void;
  children: ReactNode;
}

/** Another message quoted inside a bubble, as a tappable block. */
export function BubbleExcerpt({ onClick, children }: BubbleExcerptProps) {
  return (
    <button type="button" className={styles.excerpt} onClick={onClick}>
      {children}
    </button>
  );
}
