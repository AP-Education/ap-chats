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
  const { viewer } = useTimelineActions();
  const { call } = item;
  const outgoing = call.startedByMemberId === viewer.memberId;

  return (
    <div className={styles.row} data-own={outgoing || undefined} role="status">
      <Bubble own={outgoing}>
        <div className={styles.call}>
          <span className={styles.details}>
            <span className={styles.title}>{callTitle(call.status, outgoing)}</span>
            <CallCaption item={item} outgoing={outgoing} />
          </span>
          <CallBubbleAction call={call} />
        </div>
      </Bubble>
    </div>
  );
}

function callTitle(status: CallHistoryItem['call']['status'], outgoing: boolean): string {
  if (status === 'active') return 'Дзвінок триває';
  if (status === 'declined') return 'Дзвінок відхилено';
  if (status === 'missed') return outgoing ? 'Дзвінок без відповіді' : 'Пропущений дзвінок';
  return outgoing ? 'Вихідний дзвінок' : 'Вхідний дзвінок';
}
