import { createStyles } from 'antd-style';

import { getCallStatusIcon } from '@/features/calls/callStatusIcon';
import { formatCallDuration } from '@/features/calls/formatCallDuration';
import { useConversationScope } from '@/features/social/conversation/store';

import type { CallHistoryItem } from '../../types';
import { Bubble } from '../Bubble/Bubble';
import { RecordedCallJoinButton } from './RecordedCallJoinButton';

const timeFormat = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    display: flex;
    min-width: 0;
    padding: 1px 6px;

    &[data-own] {
      justify-content: flex-end;
    }
  `,
  call: css`
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 200px;
    padding: 2px 0;
  `,
  icon: css`
    display: grid;
    place-items: center;
    flex: 0 0 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--bubble-accent);
    color: var(--bubble-on-accent);
  `,
  iconLive: css`
    background: ${token.colorSuccess};
    color: ${token.colorWhite};
  `,
  iconMissed: css`
    background: ${token.colorError};
    color: ${token.colorWhite};
  `,
  details: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  `,
  title: css`
    font-weight: 600;
    line-height: 20px;
  `,
  caption: css`
    display: flex;
    align-items: baseline;
    gap: 12px;
    color: var(--bubble-muted);
    font-size: 13px;
    line-height: 18px;
    font-variant-numeric: tabular-nums;
  `,
  time: css`
    margin-left: auto;
    color: var(--bubble-meta);
    font-size: 12px;
  `,
  service: css`
    display: flex;
    justify-content: center;
    padding: 4px 16px;
  `,
  pill: css`
    --bubble-link: ${token.colorWhite};
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 4px 8px;
    max-width: 100%;
    padding: 3px 12px;
    border-radius: 13px;
    background: var(--chat-service-bg, rgba(0, 0, 0, 0.32));
    backdrop-filter: blur(12px) saturate(1.4);
    color: ${token.colorWhite};
    font-size: 13px;
    line-height: 20px;
    font-weight: 600;
    text-align: center;
  `,
  pillTime: css`
    font-weight: 500;
    opacity: 0.8;
  `,
}));

interface CallLogRowProps {
  item: CallHistoryItem;
  viewerMemberId: string | undefined;
}

/** The call's permanent record in the timeline. A direct conversation shows it as a
 * call bubble on the caller's side; a channel call is a shared event, so it reads as a
 * centred service line. Discovering an ongoing call stays the ActiveCallBanner's job;
 * this row is history, with a join shortcut riding along while it's still live. */
export function CallLogRow({ item, viewerMemberId }: CallLogRowProps) {
  const { kind } = useConversationScope();
  const outgoing = item.call.startedByMemberId === viewerMemberId;

  if (kind === 'channel') return <CallServiceLine item={item} outgoing={outgoing} />;
  return <CallBubble item={item} outgoing={outgoing} />;
}

interface CallEntryProps {
  item: CallHistoryItem;
  outgoing: boolean;
}

function CallBubble({ item, outgoing }: CallEntryProps) {
  const { styles, cx } = useStyles();
  const { call } = item;
  const { Icon, live, missed } = getCallStatusIcon(call.status, outgoing);

  return (
    <div className={styles.row} data-own={outgoing || undefined} role="status">
      <Bubble own={outgoing} groupStart groupEnd>
        <div className={styles.call}>
          <span className={cx(styles.icon, live && styles.iconLive, missed && styles.iconMissed)}>
            <Icon size={20} weight="fill" />
          </span>
          <span className={styles.details}>
            <span className={styles.title}>{callTitle(call.status, outgoing)}</span>
            <span className={styles.caption}>
              {live && <RecordedCallJoinButton call={call} />}
              {call.status === 'ended' && call.endedAt && (
                <span>{formatCallDuration(call.startedAt, call.endedAt)}</span>
              )}
              <time className={styles.time} dateTime={item.createdAt}>
                {timeFormat.format(new Date(item.createdAt))}
              </time>
            </span>
          </span>
        </div>
      </Bubble>
    </div>
  );
}

function CallServiceLine({ item, outgoing }: CallEntryProps) {
  const { styles } = useStyles();
  const { call } = item;
  const { Icon, live } = getCallStatusIcon(call.status, outgoing);
  const starterName = item.startedBy.displayName ?? 'Колега';

  return (
    <div className={styles.service} role="status">
      <span className={styles.pill}>
        <Icon size={16} weight="fill" aria-hidden />
        {channelCallText(item, outgoing, starterName)}
        {live && <RecordedCallJoinButton call={call} />}
        <time className={styles.pillTime} dateTime={item.createdAt}>
          {timeFormat.format(new Date(item.createdAt))}
        </time>
      </span>
    </div>
  );
}

function callTitle(status: CallHistoryItem['call']['status'], outgoing: boolean): string {
  if (status === 'active') return 'Дзвінок триває';
  if (status === 'declined') return 'Дзвінок відхилено';
  if (status === 'missed') return outgoing ? 'Дзвінок без відповіді' : 'Пропущений дзвінок';
  return outgoing ? 'Вихідний дзвінок' : 'Вхідний дзвінок';
}

function channelCallText(item: CallHistoryItem, outgoing: boolean, starterName: string): string {
  if (item.call.status === 'ringing' || item.call.status === 'active')
    return outgoing ? 'Ви розпочали дзвінок' : `${starterName} розпочав(-ла) дзвінок`;
  if (item.call.status === 'missed') return 'Пропущений дзвінок';
  if (item.call.status === 'declined') return 'Дзвінок відхилено';
  const direction = outgoing ? 'Вихідний дзвінок' : 'Вхідний дзвінок';
  if (item.call.status === 'ended' && item.call.endedAt)
    return `${direction}, ${formatCallDuration(item.call.startedAt, item.call.endedAt)}`;
  return direction;
}
