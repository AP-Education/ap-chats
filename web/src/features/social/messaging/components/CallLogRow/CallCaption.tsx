import { ArrowDownLeftIcon, ArrowUpRightIcon } from '@phosphor-icons/react';

import { getCallStatusIcon } from '@/features/calls/callStatusIcon';
import { formatCallDuration } from '@/features/calls/formatCallDuration';
import { dateTimeFormat } from '@/shared/i18n/format';
import { useChatsLanguage } from '@/shared/i18n/useChatsLanguage';

import type { CallHistoryItem } from '../../types';
import styles from './CallCaption.module.css';

const timeFormat = dateTimeFormat({ hour: '2-digit', minute: '2-digit' });

function endedDuration(call: CallHistoryItem['call']): string | null {
  if (call.status !== 'ended' || !call.answeredAt || !call.endedAt) return null;
  return formatCallDuration(call.answeredAt, call.endedAt);
}

interface CallCaptionProps {
  item: CallHistoryItem;
  outgoing: boolean;
}

/** Telegram's line under a call: which way it went (red when it never connected), how
 * long it lasted, and when. */
export function CallCaption({ item, outgoing }: CallCaptionProps) {
  const locale = useChatsLanguage();
  const { missed } = getCallStatusIcon(item.call.status, outgoing);
  const DirectionIcon = outgoing ? ArrowUpRightIcon : ArrowDownLeftIcon;
  const duration = endedDuration(item.call);

  return (
    <span className={styles.caption}>
      <DirectionIcon size={14} weight="bold" className={missed ? styles.missed : undefined} />
      {duration && <span>{duration}</span>}
      <time className={styles.time} dateTime={item.createdAt}>
        {timeFormat(locale).format(new Date(item.createdAt))}
      </time>
    </span>
  );
}
