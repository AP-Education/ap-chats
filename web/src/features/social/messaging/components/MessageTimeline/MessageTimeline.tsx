import { buildDays, landedNonces, type PendingEntry } from '@ap-education/timeline';
import {
  createRegistry,
  TimelineDays,
  type TimelineParts,
  type TimelineView,
  useScrollAnchoring,
} from '@ap-education/timeline/react';
import { ArrowDownIcon, ArrowUpIcon } from '@phosphor-icons/react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useConversationExtensions } from '@/features/social/conversation-scope/extensions';

import { flashMessage } from '../../flashMessage';
import type { ChatEntry, ChatMeta, ConversationEntry } from '../../timeline/chat-entry';
import { chatKinds } from '../../timeline/chat-registry';
import { useTimelineLabels } from '../packageLabels';
import { DaySection } from './DaySection';
import { EmptyTimeline } from './EmptyTimeline';
import { ExtensionPending, useExtensionPending } from './ExtensionPending';
import { LoadMoreButton } from './LoadMoreButton';
import { RunSection, UnreadMark } from './RunSection';
import { TimelineScroller } from './TimelineScroller';

const PARTS: TimelineParts<ConversationEntry> = { Day: DaySection, Run: RunSection, UnreadMark };

interface MessageTimelineProps {
  view: TimelineView<ChatEntry, ChatMeta>;
  /** The viewer's messages still on their way, drawn below the history. */
  pending: readonly PendingEntry<ChatEntry>[];
  targetMessageId?: string;
}

export function MessageTimeline({ view, pending, targetMessageId }: MessageTimelineProps) {
  const { t } = useTranslation('messaging');
  const labels = useTimelineLabels();
  const extensions = useConversationExtensions();
  const { entries, firstUnread, older, newer } = view;
  const registry = useMemo(
    () => createRegistry([...chatKinds, ...extensions.flatMap(({ kinds = [] }) => kinds)]),
    [extensions],
  );
  const landed = useMemo(() => landedNonces(entries), [entries]);
  const extensionPending = useExtensionPending(extensions, landed);
  const shownPending = useMemo(
    // Only the live end: what happens next has no place after an older stretch.
    () => (newer.available ? pending : [...pending, ...extensionPending.pending]),
    [pending, extensionPending.pending, newer.available],
  );
  const days = useMemo(
    () => buildDays(entries, shownPending, firstUnread, registry.rules),
    [entries, shownPending, firstUnread, registry],
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
          {t(($) => $.timeline.loadOlder)}
        </LoadMoreButton>
      )}
      {isEmpty && <EmptyTimeline />}
      <TimelineDays days={days} registry={registry} labels={labels} parts={PARTS} />
      {extensions.map(
        ({ id, usePending }) =>
          usePending && (
            <ExtensionPending
              key={id}
              id={id}
              usePending={usePending}
              landed={landed}
              report={extensionPending.report}
            />
          ),
      )}
      {newer.available && (
        <LoadMoreButton icon={<ArrowDownIcon />} loading={newer.loading} onLoad={newer.load}>
          {t(($) => $.timeline.loadNewer)}
        </LoadMoreButton>
      )}
    </TimelineScroller>
  );
}
