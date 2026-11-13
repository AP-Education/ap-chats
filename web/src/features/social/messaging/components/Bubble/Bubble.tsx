import { TimelineEntryBubble } from '@ap-education/timeline/react';
import type { ReactNode } from 'react';

import styles from './Bubble.module.css';

export type BubbleVariant = 'text' | 'bare' | 'voice';

interface BubbleProps {
  variant?: BubbleVariant;
  wide?: boolean;
  children: ReactNode;
}

/** The timeline's bubble with what a chat adds: no bubble behind large emoji or a lone GIF, and the
 * full width while editing. */
export function Bubble({ variant = 'text', wide, children }: BubbleProps) {
  return (
    <TimelineEntryBubble
      className={styles.bubble}
      data-variant={variant}
      data-wide={wide || undefined}
    >
      {children}
    </TimelineEntryBubble>
  );
}
