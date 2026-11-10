import { LockSimpleIcon, SparkleIcon } from '@phosphor-icons/react';

import styles from './StarMePrivateHeading.module.css';

export function StarMePrivateHeading({ showName = true }: { showName?: boolean }) {
  return (
    <div className={styles.heading}>
      {showName && (
        <span className={styles.name}>
          <SparkleIcon size={14} weight="fill" aria-hidden="true" />
          StarMe
        </span>
      )}
      <span className={styles.privacy}>
        <LockSimpleIcon size={13} aria-hidden="true" />
        Лише для вас
      </span>
    </div>
  );
}
