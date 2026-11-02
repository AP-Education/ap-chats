import type { RunFrameProps, UnreadMarkProps } from '@ap-education/timeline/react';

import type { MemberSummary } from '@/features/workspaces/types';

import type { ConversationEntry } from '../../timeline/chat-entry';
import { useTimelineActions } from '../../timeline-actions-context';
import { HistoryRun } from '../HistoryRun/HistoryRun';
import styles from './RunSection.module.css';

/** One author's run: incoming runs show their author's face, the viewer's own need none. */
export function RunSection({ run, children }: RunFrameProps<ConversationEntry>) {
  const { viewer } = useTimelineActions();
  const first = run.items[0]?.entry;
  const author = first && authorOf(first);
  const avatar = author && author.memberId !== viewer.memberId ? author : null;

  return <HistoryRun avatar={avatar}>{children}</HistoryRun>;
}

// A call belongs to whoever placed it; an extension's entry names its author.
function authorOf(entry: ConversationEntry): MemberSummary {
  if (entry.kind === 'MESSAGE') return entry.payload.item.author;
  if (entry.kind === 'CALL') return entry.payload.item.startedBy;
  return entry.payload.author;
}

/** Where what is new to the reader starts. */
export function UnreadMark({ label }: UnreadMarkProps) {
  return <div className={styles.unread}>{label}</div>;
}
