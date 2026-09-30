import { PhoneIncomingIcon, PhoneOutgoingIcon, PhoneXIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

import type { CallHistoryItem } from '../../types';

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin: 6px 20px;
    padding: 6px 14px;
    border-radius: 999px;
    background: ${token.colorFillTertiary};
    color: ${token.colorTextSecondary};
    font-size: 13px;
  `,
  missed: css`
    color: ${token.colorError};
  `,
}));

function duration(startedAt: string, endedAt: string): string {
  const seconds = Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function label(item: CallHistoryItem, outgoing: boolean): string {
  if (item.call.status === 'missed') return 'Пропущений дзвінок';
  if (item.call.status === 'declined') return 'Дзвінок відхилено';
  const direction = outgoing ? 'Вихідний дзвінок' : 'Вхідний дзвінок';
  if (item.call.status === 'ended' && item.call.endedAt)
    return `${direction} · ${duration(item.call.startedAt, item.call.endedAt)}`;
  return direction;
}

interface CallLogRowProps {
  item: CallHistoryItem;
  viewerMemberId: string | undefined;
}

/** The call's permanent record in the timeline, styled like Telegram's call-log entry, not a message bubble. */
export function CallLogRow({ item, viewerMemberId }: CallLogRowProps) {
  const { styles, cx } = useStyles();
  const missed = item.call.status === 'missed' || item.call.status === 'declined';
  const outgoing = item.call.startedByMemberId === viewerMemberId;
  const Icon = missed ? PhoneXIcon : outgoing ? PhoneOutgoingIcon : PhoneIncomingIcon;

  return (
    <div className={cx(styles.row, missed && styles.missed)} role="status">
      <Icon size={15} weight={missed ? 'fill' : 'regular'} />
      <span>{label(item, outgoing)}</span>
    </div>
  );
}
