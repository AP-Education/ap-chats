import type { RunFrameProps, UnreadMarkProps } from '@ap-education/timeline/react';

import type { ChatEntry } from '../../timeline/chat-entry';
import { useTimelineActions } from '../../timeline-actions-context';
import { HistoryRun } from '../HistoryRun/HistoryRun';
import styles from './RunSection.module.css';

/** One author's run: incoming runs show their author's face, the viewer's own need none. */
export function RunSection({ run, children }: RunFrameProps<ChatEntry>) {
  const { viewer } = useTimelineActions();
  const item = run.items[0]?.entry.payload.item;
  const author = item && (item.type === 'MESSAGE' ? item.author : item.startedBy);
  const avatar = author && author.memberId !== viewer.memberId ? author : null;

  return <HistoryRun avatar={avatar}>{children}</HistoryRun>;
}

/** Where what is new to the reader starts. */
export function UnreadMark({ label }: UnreadMarkProps) {
  return <div className={styles.unread}>{label}</div>;
}
