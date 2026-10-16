import type { ReactNode } from 'react';

import styles from './Bubble.module.css';

export type BubbleVariant = 'text' | 'media' | 'bare';

interface BubbleProps {
  own: boolean;
  variant?: BubbleVariant;
  tone?: 'attention' | 'failed';
  wide?: boolean;
  children: ReactNode;
}

export function Bubble({ own, variant = 'text', tone, wide, children }: BubbleProps) {
  const hasTail = variant !== 'bare';

  return (
    <div
      className={styles.stack}
      data-side={own ? 'own' : 'incoming'}
      data-tone={tone}
      data-wide={wide || undefined}
    >
      <div className={styles.bubble} data-variant={variant}>
        {children}
      </div>
      {hasTail && <span className={styles.tail} aria-hidden />}
    </div>
  );
}
