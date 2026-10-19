import { ArrowClockwiseIcon, ImageIcon } from '@phosphor-icons/react';

import styles from './ImageStatus.module.css';

/** What a photo shows before it is there: that it is coming, or that it failed and can retry. */
export function ImageStatus({ broken }: { broken: boolean }) {
  return (
    <span className={styles.status} aria-hidden>
      {broken ? <ArrowClockwiseIcon size={28} /> : <ImageIcon size={28} />}
    </span>
  );
}
