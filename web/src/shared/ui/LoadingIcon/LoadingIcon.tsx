import { SpinnerGapIcon } from '@phosphor-icons/react';

import styles from './LoadingIcon.module.css';

interface LoadingIconProps {
  size?: number;
}

export function LoadingIcon({ size = 20 }: LoadingIconProps) {
  return <SpinnerGapIcon size={size} className={styles.icon} aria-hidden="true" />;
}
