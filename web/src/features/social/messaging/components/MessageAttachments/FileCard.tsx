import type { ReactNode } from 'react';

import styles from './FileCard.module.css';

// A long name gives way in its middle; this many letters at its end, the extension among them, stay.
const NAME_TAIL = 10;

interface FileCardProps {
  name: string;
  meta: ReactNode;
  metaTone?: 'error';
  /** The round control before the name: the file's one main action. */
  badge: ReactNode;
  /** Pressing the name downloads the file; left out, the name is plain text. */
  onNamePress?: () => void;
  nameDisabled?: boolean;
  trailing?: ReactNode;
  /** Shown under the card, such as an audio player. */
  children?: ReactNode;
}

// One frame for delivered and uploading files, so a row doesn't jump when its upload lands.
export function FileCard({
  name,
  meta,
  metaTone,
  badge,
  onNamePress,
  nameDisabled,
  trailing,
  children,
}: FileCardProps) {
  const label = (
    <>
      <span className={styles.head}>{name.slice(0, -NAME_TAIL)}</span>
      <span className={styles.tail}>{name.slice(-NAME_TAIL)}</span>
    </>
  );

  return (
    <article aria-label={name}>
      <div className={styles.card}>
        {badge}
        <div className={styles.details}>
          {onNamePress ? (
            <button
              type="button"
              className={styles.name}
              disabled={nameDisabled}
              onClick={onNamePress}
              title={name}
            >
              {label}
            </button>
          ) : (
            <span className={styles.name} title={name}>
              {label}
            </span>
          )}
          <div className={styles.meta} data-tone={metaTone}>
            {meta}
          </div>
        </div>
        {trailing && <div className={styles.trailing}>{trailing}</div>}
      </div>
      {children}
    </article>
  );
}
