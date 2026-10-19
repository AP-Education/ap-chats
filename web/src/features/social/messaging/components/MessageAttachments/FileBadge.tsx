import type { ReactNode } from 'react';

import styles from './FileBadge.module.css';

interface FileBadgeProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Upload progress, 0 to 100, drawn as a ring around the glyph. */
  progress?: number;
  /** A photo's own preview, shown behind the glyph. */
  previewUrl?: string;
  children: ReactNode;
}

const MIN_ARC = 8;

export function FileBadge({
  label,
  onPress,
  disabled,
  progress,
  previewUrl,
  children,
}: FileBadgeProps) {
  return (
    <button
      type="button"
      className={styles.badge}
      aria-label={label}
      disabled={disabled}
      data-preview={previewUrl ? true : undefined}
      onClick={onPress}
    >
      {previewUrl && <img className={styles.preview} src={previewUrl} alt="" />}
      {progress !== undefined && (
        <svg className={styles.ring} viewBox="0 0 40 40" aria-hidden>
          <circle
            cx="20"
            cy="20"
            r="18"
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset={100 - Math.max(MIN_ARC, progress)}
          />
        </svg>
      )}
      <span className={styles.glyph}>{children}</span>
    </button>
  );
}
