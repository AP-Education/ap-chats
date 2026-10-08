import { createStyles } from 'antd-style';

import type { CallHistoryItem } from '../../types';
import { Bubble } from '../Bubble/Bubble';
import { CallBubbleAction } from './CallBubbleAction';
import { CallCaption } from './CallCaption';

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    display: flex;
    min-width: 0;

    &[data-own] {
      justify-content: flex-end;
    }
  `,
  call: css`
    display: flex;
    align-items: center;
    gap: ${token.padding}px;
    min-width: 220px;
    padding: 2px 0;
  `,
  details: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  `,
  title: css`
    font-weight: 600;
    line-height: 1.3;
  `,
}));

interface CallLogRowProps {
  item: CallHistoryItem;
  viewerMemberId: string | undefined;
}

/** The call's permanent record: a bubble on the side of whoever placed it, joining their
 * run like a message would. Discovering an ongoing call stays the ActiveCallBanner's job;
 * the bubble's own button joins it while it runs and calls back once it has ended. */
export function CallLogRow({ item, viewerMemberId }: CallLogRowProps) {
  const { styles } = useStyles();
  const { call } = item;
  const outgoing = call.startedByMemberId === viewerMemberId;

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
