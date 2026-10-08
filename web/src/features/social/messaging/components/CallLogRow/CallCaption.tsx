import { ArrowDownLeftIcon, ArrowUpRightIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

import { getCallStatusIcon } from '@/features/calls/callStatusIcon';
import { formatCallDuration } from '@/features/calls/formatCallDuration';

import type { CallHistoryItem } from '../../types';

const timeFormat = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });

const useStyles = createStyles(({ token, css }) => ({
  caption: css`
    display: flex;
    align-items: center;
    gap: ${token.paddingXXS}px;
    color: var(--bubble-muted);
    font-size: ${token.fontSizeSM}px;
    line-height: 1.4;
    font-variant-numeric: tabular-nums;
  `,
  // Own bubbles keep their muted ink: red on the accent fill would not read.
  missed: css`
    color: ${token.colorError};

    [data-own] & {
      color: inherit;
    }
  `,
  time: css`
    margin-left: ${token.marginXS}px;
    color: var(--bubble-meta);
    font-size: 12px;
  `,
}));

function endedDuration(call: CallHistoryItem['call']): string | null {
  if (call.status !== 'ended' || !call.endedAt) return null;
  return formatCallDuration(call.startedAt, call.endedAt);
}

interface CallCaptionProps {
  item: CallHistoryItem;
  outgoing: boolean;
}

/** Telegram's line under a call: which way it went (red when it never connected), how
 * long it lasted, and when. */
export function CallCaption({ item, outgoing }: CallCaptionProps) {
  const { styles, cx } = useStyles();
  const { missed } = getCallStatusIcon(item.call.status, outgoing);
  const DirectionIcon = outgoing ? ArrowUpRightIcon : ArrowDownLeftIcon;
  const duration = endedDuration(item.call);

  return (
    <span className={styles.caption}>
      <DirectionIcon size={14} weight="bold" className={cx(missed && styles.missed)} />
      {duration && <span>{duration}</span>}
      <time className={styles.time} dateTime={item.createdAt}>
        {timeFormat.format(new Date(item.createdAt))}
      </time>
    </span>
  );
}
