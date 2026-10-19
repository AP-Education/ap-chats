import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { useTimelineActions } from '../../timeline-actions-context';
import type { CallHistoryItem } from '../../types';
import { Bubble } from '../Bubble/Bubble';
import { CallBubbleAction } from './CallBubbleAction';
import { CallCaption } from './CallCaption';
import styles from './CallLogRow.module.css';

/** The call's permanent record: a bubble on the side of whoever placed it, joining their
 * run like a message would. Discovering an ongoing call stays the ActiveCallBanner's job;
 * the bubble's own button joins it while it runs and calls back once it has ended. */
export function CallLogRow({ item }: { item: CallHistoryItem }) {
  const { t } = useTranslation('messaging');
  const { viewer } = useTimelineActions();
  const { call } = item;
  const outgoing = call.startedByMemberId === viewer.memberId;

  return (
    <div className={styles.row} data-own={outgoing || undefined} role="status">
      <Bubble own={outgoing}>
        <div className={styles.call}>
          <span className={styles.details}>
            <span className={styles.title}>{callTitle(call.status, outgoing, t)}</span>
            <CallCaption item={item} outgoing={outgoing} />
          </span>
          <CallBubbleAction call={call} />
        </div>
      </Bubble>
    </div>
  );
}

function callTitle(
  status: CallHistoryItem['call']['status'],
  outgoing: boolean,
  t: TFunction<'messaging'>,
): string {
  if (status === 'active') return t(($) => $.call.active);
  if (status === 'declined') return t(($) => $.call.declined);
  if (status === 'missed') {
    return outgoing ? t(($) => $.call.unanswered) : t(($) => $.call.missed);
  }
  return outgoing ? t(($) => $.call.outgoing) : t(($) => $.call.incoming);
}
