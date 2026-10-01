import { createStyles } from 'antd-style';

import { getCallStatusIcon } from '@/features/calls/callStatusIcon';
import { formatCallDuration } from '@/features/calls/formatCallDuration';
import { useCallAction } from '@/features/calls/hooks/useCallAction';
import { useConversationScope } from '@/features/social/conversation/store';

import type { CallHistoryItem } from '../../types';

const timeFormat = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    padding: 12px 24px;
    color: ${token.colorText};

    &:hover {
      background: ${token.colorFillQuaternary};
    }

    @media (max-width: ${token.screenMD}px) {
      gap: 8px;
      padding: 10px 12px;
    }
  `,
  icon: css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    flex: 0 0 44px;
    color: ${token.colorTextTertiary};
  `,
  iconLive: css`
    color: ${token.colorSuccess};
  `,
  iconMissed: css`
    color: ${token.colorError};
  `,
  content: css`
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    column-gap: 8px;
    min-width: 0;
  `,
  text: css`
    color: ${token.colorTextSecondary};
    font-size: 14px;
  `,
  join: css`
    padding: 0;
    border: 0;
    background: transparent;
    color: ${token.colorPrimary};
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;

    &:hover:not(:disabled) {
      text-decoration: underline;
    }

    &:disabled {
      color: ${token.colorTextQuaternary};
      cursor: not-allowed;
    }
  `,
  time: css`
    flex-shrink: 0;
    color: ${token.colorTextQuaternary};
    font-size: 11px;
  `,
}));

function text(item: CallHistoryItem, outgoing: boolean, starterName: string): string {
  if (item.call.status === 'ringing' || item.call.status === 'active')
    return outgoing ? 'Ви розпочали дзвінок.' : `${starterName} розпочав(-ла) дзвінок.`;
  if (item.call.status === 'missed') return 'Пропущений дзвінок.';
  if (item.call.status === 'declined') return 'Дзвінок відхилено.';
  const direction = outgoing ? 'Вихідний дзвінок' : 'Вхідний дзвінок';
  if (item.call.status === 'ended' && item.call.endedAt)
    return `${direction} · ${formatCallDuration(item.call.startedAt, item.call.endedAt)}.`;
  return `${direction}.`;
}

interface CallLogRowProps {
  item: CallHistoryItem;
  viewerMemberId: string | undefined;
}

/** The call's permanent record in the timeline: one inline system line, the
 * same shape whatever the status — Discord's "X started a call. — Join the
 * call" rather than a badge that changes silhouette once the call answers.
 * Discovering an ongoing call is the persistent ActiveCallBanner's job; this
 * row is history, with a join shortcut riding along while it's still live. */
export function CallLogRow({ item, viewerMemberId }: CallLogRowProps) {
  const { styles, cx } = useStyles();
  const { workspaceId, channelId, title, avatarPath } = useConversationScope();
  const call = useCallAction(workspaceId, channelId, title, avatarPath);
  const outgoing = item.call.startedByMemberId === viewerMemberId;
  const starterName = item.startedBy.displayName ?? 'Колега';
  const { Icon, live, missed } = getCallStatusIcon(item.call.status, outgoing);

  return (
    <div className={styles.row} role="status">
      <span className={cx(styles.icon, live && styles.iconLive, missed && styles.iconMissed)}>
        <Icon size={20} weight={live || missed ? 'fill' : 'regular'} />
      </span>
      <span className={styles.content}>
        <span className={styles.text}>{text(item, outgoing, starterName)}</span>
        {live && (
          <button
            type="button"
            className={styles.join}
            disabled={call.busy || call.pending}
            onClick={call.onClick}
          >
            Приєднатися до дзвінка
          </button>
        )}
        <time className={styles.time} dateTime={item.createdAt}>
          {timeFormat.format(new Date(item.createdAt))}
        </time>
      </span>
    </div>
  );
}
