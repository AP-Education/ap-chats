import type { PropsWithChildren } from 'react';

import styles from './MentionChip.module.css';

/** A chip's text in a box of its own, so a name too long for the line ends in an ellipsis. */
export function MentionChipText({ children }: PropsWithChildren) {
  return <span className={styles.text}>{children}</span>;
}
