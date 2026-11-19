import { LockSimpleIcon, SparkleIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

import styles from './StarMePrivateHeading.module.css';

export function StarMePrivateHeading({ showName = true }: { showName?: boolean }) {
  const { t } = useTranslation('starMe');

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
        {t(($) => $.onlyForYou)}
      </span>
    </div>
  );
}
