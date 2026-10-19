import { useShellLocale } from '@ap-education/shell-sdk';
import { ArrowDownIcon, ArrowUpIcon } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useConversationExtensions } from '@/features/social/conversation-scope/extensions';

import type { DisplayItem, HistoryWindow } from '../../types';
import { isMessageItem } from '../../types';
import { DaySection } from './DaySection';
import { EmptyTimeline } from './EmptyTimeline';
import { LoadMoreButton } from './LoadMoreButton';
import { buildTimelineDays, formatDayLabel } from './timeline-days';
import { TimelineScroller } from './TimelineScroller';
import { useScrollAnchoring } from './useScrollAnchoring';

interface MessageTimelineProps {
  history: HistoryWindow;
  displayItems: DisplayItem[];
}

export function MessageTimeline({ history, displayItems }: MessageTimelineProps) {
  const { t } = useTranslation('messaging');
  const locale = useShellLocale();
  const extensions = useConversationExtensions();
  const { pages, older, newer } = history;
  const items = useMemo(() => pages.flatMap((page) => page.items), [pages]);
  const firstUnreadSeq = pages.find((page) => page.firstUnreadSeq !== null)?.firstUnreadSeq ?? null;
  // A deleted message keeps its seq (read state, scroll anchoring, and reply
  // excerpts elsewhere all still need it), but has nothing left worth a row —
  // Telegram just removes it rather than leaving a "message deleted" ghost.
  // Filtered only for what's rendered, so grouping recomputes around the gap
  // instead of orphaning the next real message from the same author.
  const days = useMemo(
    () =>
      buildTimelineDays(
        displayItems.filter(({ item }) => !isMessageItem(item) || item.message.markdown !== null),
        firstUnreadSeq,
      ),
    [displayItems, firstUnreadSeq],
  );
  const anchoring = useScrollAnchoring({ history, items, displayItems, firstUnreadSeq });

  return (
    <TimelineScroller anchoring={anchoring} hasNewer={newer.available}>
      {older.available && (
        <LoadMoreButton icon={<ArrowUpIcon />} loading={older.loading} onLoad={anchoring.loadOlder}>
          {t(($) => $.timeline.loadOlder)}
        </LoadMoreButton>
      )}
      {!displayItems.length && <EmptyTimeline />}
      {days.map((day) => (
        <DaySection key={day.key} day={day} label={formatDayLabel(day.date, t, locale)} />
      ))}
      {/* Only the live end: what happens next has no place after an older stretch. */}
      {!newer.available &&
        extensions.map(({ id, TimelineEnd }) => TimelineEnd && <TimelineEnd key={id} />)}
      {newer.available && (
        <LoadMoreButton icon={<ArrowDownIcon />} loading={newer.loading} onLoad={newer.load}>
          {t(($) => $.timeline.loadNewer)}
        </LoadMoreButton>
      )}
    </TimelineScroller>
  );
}
