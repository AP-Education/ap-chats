import { buildDays, type PendingEntry } from '@ap-education/timeline';
import {
  TimelineDays,
  type TimelineLabels,
  type TimelineParts,
  type TimelineView,
  UKRAINIAN_LABELS,
  useScrollAnchoring,
} from '@ap-education/timeline/react';
import { ArrowDownIcon, ArrowUpIcon } from '@phosphor-icons/react';
import { useCallback, useMemo } from 'react';

import { useConversationExtensions } from '@/features/social/conversation-scope/extensions';

import { flashMessage } from '../../flashMessage';
import type { ChatEntry, ChatMeta } from '../../timeline/chat-entry';
import { chatRegistry } from '../../timeline/chat-registry';
import { DaySection } from './DaySection';
import { EmptyTimeline } from './EmptyTimeline';
import { LoadMoreButton } from './LoadMoreButton';
import { RunSection, UnreadMark } from './RunSection';
import { TimelineScroller } from './TimelineScroller';

const LABELS: TimelineLabels = { ...UKRAINIAN_LABELS, unread: 'Нові повідомлення' };
const PARTS: TimelineParts<ChatEntry> = { Day: DaySection, Run: RunSection, UnreadMark };

interface MessageTimelineProps {
  view: TimelineView<ChatEntry, ChatMeta>;
  /** The viewer's messages still on their way, drawn below the history. */
  pending: readonly PendingEntry<ChatEntry>[];
  targetMessageId?: string;
}

export function MessageTimeline({ view, pending, targetMessageId }: MessageTimelineProps) {
  const extensions = useConversationExtensions();
  const { entries, firstUnread, older, newer } = view;
  const days = useMemo(
    () => buildDays(entries, pending, firstUnread, chatRegistry.rules),
    [entries, pending, firstUnread],
  );
  const lastKey = days.at(-1)?.runs.at(-1)?.items.at(-1)?.key;
  const flashTarget = useCallback(() => {
    if (targetMessageId) flashMessage(targetMessageId);
  }, [targetMessageId]);
  const anchoring = useScrollAnchoring({
    older,
    newer,
    isReady: view.status === 'success',
    content: days,
    lastKey,
    firstUnread,
    targetKey: targetMessageId,
    onTargetShown: flashTarget,
  });
  const isEmpty = entries.length === 0 && pending.length === 0;

  return (
    <TimelineScroller anchoring={anchoring} hasNewer={newer.available}>
      {older.available && (
        <LoadMoreButton icon={<ArrowUpIcon />} loading={older.loading} onLoad={anchoring.loadOlder}>
          Раніші повідомлення
        </LoadMoreButton>
      )}
      {isEmpty && <EmptyTimeline />}
      <TimelineDays days={days} registry={chatRegistry} labels={LABELS} parts={PARTS} />
      {/* Only the live end: what happens next has no place after an older stretch. */}
      {!newer.available &&
        extensions.map(({ id, TimelineEnd }) => TimelineEnd && <TimelineEnd key={id} />)}
      {newer.available && (
        <LoadMoreButton icon={<ArrowDownIcon />} loading={newer.loading} onLoad={newer.load}>
          Новіші повідомлення
        </LoadMoreButton>
      )}
    </TimelineScroller>
  );
}
