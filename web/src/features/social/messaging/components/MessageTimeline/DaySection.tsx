import { type DayFrameProps, TimelineEntrySystem } from '@ap-education/timeline/react';

import styles from './DaySection.module.css';

/** One calendar day under its sticky date; the timeline package memoizes it and fills its runs.
 * The date floats over the messages only while they scroll (see useFloatingDates). */
export function DaySection({ label, children }: DayFrameProps) {
  return (
    <section className={styles.day} aria-label={label}>
      <div className={styles.dateBar} data-chat-inset data-day-bar>
        <TimelineEntrySystem>{label}</TimelineEntrySystem>
      </div>
      {children}
    </section>
  );
}
