import { IconButton, LoadingIcon, useIsMobile } from '@ap-education/ui';
import { createStyles } from 'antd-style';
import { Link } from 'react-router-dom';

import { callActionLabel } from '@/features/calls/callActionLabel';
import { CallIcon } from '@/features/calls/callIcons';
import { getCallStatusIcon } from '@/features/calls/callStatusIcon';
import { useKnownCallAction } from '@/features/calls/hooks/useKnownCallAction';
import { Avatar } from '@/shared/ui/Avatar';

import { callEntryStatus, formatCallDate } from './callHistoryLabels';
import type { CallHistoryEntry } from './groupCallHistory';

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    position: relative;
    display: flex;
    align-items: center;
    min-height: 56px;
    color: ${token.colorTextSecondary};

    &:hover {
      background: ${token.colorFillTertiary};
    }

    @media (hover: hover) {
      &:hover [data-role='call-back'],
      &:focus-within [data-role='call-back'] {
        opacity: 1;
        pointer-events: auto;
      }

      &:hover [data-role='call-date'],
      &:focus-within [data-role='call-date'] {
        opacity: 0;
      }
    }

    @media (max-width: ${token.screenMD}px) {
      min-height: 64px;
    }
  `,
  active: css`
    && {
      background: ${token.colorPrimaryBg};
    }

    &&:hover {
      background: ${token.colorPrimaryBgHover};
    }
  `,
  link: css`
    display: flex;
    flex: 1;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 9px 12px;
    text-decoration: none;

    &::after {
      content: '';
      position: absolute;
      inset: 0;
    }

    &,
    &:link,
    &:visited,
    &:hover,
    &:focus,
    &:active {
      color: inherit;
    }

    &:focus {
      outline: none;
    }

    &:focus-visible::after {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: -2px;
    }

    @media (max-width: ${token.screenMD}px) {
      gap: 12px;
      padding: 6px 12px;
    }
  `,
  body: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  `,
  nameLine: css`
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  `,
  name: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: ${token.colorText};
    font-weight: 500;

    @media (max-width: ${token.screenMD}px) {
      font-size: 16px;
      line-height: 24px;
      font-weight: 600;
    }
  `,
  nameMissed: css`
    color: ${token.colorError};
  `,
  status: css`
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    color: ${token.colorTextTertiary};
    font-size: 12px;

    @media (max-width: ${token.screenMD}px) {
      font-size: 14px;
      line-height: 20px;
    }
  `,
  statusIcon: css`
    flex-shrink: 0;
  `,
  statusLive: css`
    color: ${token.colorSuccess};
  `,
  statusText: css`
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  `,
  date: css`
    flex-shrink: 0;
    color: ${token.colorTextTertiary};
    font-size: 12px;
    white-space: nowrap;
    transition: opacity 0.15s ease;
  `,
  dateHidden: css`
    @media (hover: hover) {
      opacity: 0;
    }
  `,
  callBack: css`
    position: absolute;
    right: 10px;
    top: 50%;
    z-index: 1;
    display: flex;
    transform: translateY(-50%);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;

    @media (hover: none) {
      position: static;
      transform: none;
      margin-right: 8px;
      opacity: 1;
      pointer-events: auto;
    }
  `,
  callBackShown: css`
    && {
      opacity: 1;
      pointer-events: auto;
    }
  `,
  callButton: css`
    border-radius: 50%;
    color: ${token.colorTextSecondary};
  `,
  callButtonActive: css`
    && {
      background: ${token.colorPrimaryBg};
      color: ${token.colorPrimary};
    }
  `,
}));

/** Remembers which of several rows with the same person was clicked, so only it lights up. */
export interface CallEntryLinkState {
  callEntry: string;
}

interface CallHistoryRowProps {
  entry: CallHistoryEntry;
  active: boolean;
  onNavigate?: () => void;
}

export function CallHistoryRow({ entry, active, onNavigate }: CallHistoryRowProps) {
  const { styles, cx } = useStyles();
  const isMobile = useIsMobile();
  const { latest, count, outgoing } = entry;
  const name = latest.participant.displayName ?? 'Колега';
  const { Icon, live, missed } = getCallStatusIcon(latest.status, outgoing);
  const call = useKnownCallAction(
    latest.workspaceId,
    latest.channelId,
    name,
    latest.participant.avatarPath,
    latest,
  );
  const callTitle = callActionLabel(call, `Подзвонити: ${name}`);
  const callBackShown = call.inCall || call.joinable || call.pending;

  return (
    <div className={cx(styles.row, active && styles.active)}>
      <Link
        to={`/calls/${latest.channelId}`}
        state={{ callEntry: entry.key } satisfies CallEntryLinkState}
        onClick={onNavigate}
        className={styles.link}
        aria-current={active ? 'page' : undefined}
      >
        <Avatar
          path={latest.participant.avatarPath}
          alt={name}
          size={isMobile ? 44 : 36}
          shape="circle"
        />
        <span className={styles.body}>
          <span className={styles.nameLine}>
            <span className={cx(styles.name, missed && !outgoing && styles.nameMissed)}>
              {count > 1 ? `${name} (${count})` : name}
            </span>
            <time
              data-role="call-date"
              className={cx(styles.date, callBackShown && styles.dateHidden)}
              dateTime={latest.startedAt}
            >
              {formatCallDate(latest.startedAt)}
            </time>
          </span>
          <span className={cx(styles.status, live && styles.statusLive)}>
            <Icon size={14} weight={live ? 'fill' : 'regular'} className={styles.statusIcon} />
            <span className={styles.statusText}>{callEntryStatus(entry)}</span>
          </span>
        </span>
      </Link>
      {latest.participant.active && (
        <span
          data-role="call-back"
          className={cx(styles.callBack, callBackShown && styles.callBackShown)}
        >
          <IconButton
            size={32}
            aria-label={callTitle}
            disabled={call.busy || call.pending}
            onClick={call.onClick}
            className={cx(styles.callButton, callBackShown && styles.callButtonActive)}
          >
            {call.pending ? <LoadingIcon size={18} /> : <CallIcon size={18} />}
          </IconButton>
        </span>
      )}
    </div>
  );
}
