import { LoadingOutlined } from '@ant-design/icons';
import { PhoneIcon } from '@phosphor-icons/react';
import { Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { Link } from 'react-router-dom';

import { callActionLabel } from '@/features/calls/callActionLabel';
import { getCallStatusIcon } from '@/features/calls/callStatusIcon';
import { formatCallDuration } from '@/features/calls/formatCallDuration';
import { useCallAction } from '@/features/calls/hooks/useCallAction';
import { Avatar } from '@/shared/ui/Avatar/Avatar';
import { IconButton } from '@/shared/ui/IconButton';

import type { CallHistoryItem } from '../../api/calls-api';

const timeFormat = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 -12px;
    padding: 10px 12px;
    border-radius: ${token.borderRadiusLG}px;

    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  identity: css`
    display: flex;
    flex: 1;
    align-items: center;
    gap: 12px;
    min-width: 0;
    text-decoration: none;

    &,
    &:link,
    &:visited,
    &:hover,
    &:focus,
    &:active {
      color: inherit;
    }

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: -2px;
      border-radius: ${token.borderRadius}px;
    }
  `,
  body: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  `,
  nameLine: css`
    display: flex;
    align-items: baseline;
    gap: 8px;
  `,
  name: css`
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: ${token.colorText};
    font-weight: 600;
    line-height: 1.3;
  `,
  nameMissed: css`
    color: ${token.colorError};
  `,
  status: css`
    display: flex;
    align-items: center;
    gap: 5px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: ${token.colorTextTertiary};
    font-size: 13px;
    line-height: 1.3;
  `,
  statusIcon: css`
    flex-shrink: 0;
    color: ${token.colorTextQuaternary};
  `,
  toneLive: css`
    color: ${token.colorSuccess};
  `,
  toneMissed: css`
    color: ${token.colorError};
  `,
  time: css`
    flex-shrink: 0;
    color: ${token.colorTextQuaternary};
    font-size: 12px;
  `,
  callButton: css`
    flex-shrink: 0;
    border-radius: 50%;
    background: ${token.colorFillTertiary};
    color: ${token.colorTextSecondary};

    &:hover:not(:disabled) {
      background: ${token.colorFillSecondary};
    }
  `,
  callButtonActive: css`
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};

    &:hover:not(:disabled) {
      background: ${token.colorPrimaryBgHover};
    }
  `,
}));

function statusText(item: CallHistoryItem, outgoing: boolean): string {
  if (item.status === 'ringing' || item.status === 'active') return 'Дзвінок триває';
  if (item.status === 'declined') return 'Дзвінок відхилено';
  if (item.status === 'missed') return outgoing ? 'Без відповіді' : 'Пропущений дзвінок';
  if (item.status === 'ended' && item.endedAt)
    return `${outgoing ? 'Вихідний' : 'Вхідний'} · ${formatCallDuration(item.startedAt, item.endedAt)}`;
  return outgoing ? 'Вихідний дзвінок' : 'Вхідний дзвінок';
}

interface CallHistoryRowProps {
  item: CallHistoryItem;
  workspaceId: string;
}

export function CallHistoryRow({ item, workspaceId }: CallHistoryRowProps) {
  const { styles, cx } = useStyles();
  const name = item.participant.displayName ?? 'Колега';
  const outgoing = item.startedByMemberId !== item.participant.memberId;
  const { Icon, tone } = getCallStatusIcon(item.status, outgoing);
  const call = useCallAction(workspaceId, item.channelId, name, item.participant.avatarPath);
  const callTitle = callActionLabel(call, `Подзвонити: ${name}`);

  return (
    <div className={styles.row}>
      <Link
        to={`/direct/${item.channelId}`}
        className={styles.identity}
        aria-label={`Відкрити розмову з ${name}`}
      >
        <Avatar path={item.participant.avatarPath} alt={name} size={40} shape="circle" />
        <span className={styles.body}>
          <span className={styles.nameLine}>
            <span className={cx(styles.name, tone === 'missed' && styles.nameMissed)}>{name}</span>
            <time className={styles.time} dateTime={item.startedAt}>
              {timeFormat.format(new Date(item.startedAt))}
            </time>
          </span>
          <span className={styles.status}>
            <Icon
              size={14}
              weight={tone !== 'neutral' ? 'fill' : 'regular'}
              className={cx(
                styles.statusIcon,
                tone === 'live' && styles.toneLive,
                tone === 'missed' && styles.toneMissed,
              )}
            />
            {statusText(item, outgoing)}
          </span>
        </span>
      </Link>
      <Tooltip title={callTitle}>
        <span>
          <IconButton
            size={44}
            aria-label={callTitle}
            disabled={call.busy || call.pending || !item.participant.active}
            onClick={call.onClick}
            className={cx(
              styles.callButton,
              (call.inCall || call.joinable) && styles.callButtonActive,
            )}
          >
            {call.pending ? (
              <LoadingOutlined style={{ fontSize: 20 }} />
            ) : (
              <PhoneIcon size={21} weight={call.joinable ? 'fill' : 'regular'} />
            )}
          </IconButton>
        </span>
      </Tooltip>
    </div>
  );
}
