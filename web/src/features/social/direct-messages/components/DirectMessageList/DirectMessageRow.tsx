import { useIsMobile } from '@ap-education/ui';
import { BellSlashIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import { Link, useMatch } from 'react-router-dom';

import { Avatar } from '@/shared/ui/Avatar';

import type { DirectMessage } from '../../api/direct-messages-api';

const dateFormat = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'numeric' });

function formatRecentTime(value: string) {
  const date = new Date(value);
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (minutes < 1) return 'щойно';
  if (minutes < 60) return `${minutes} хв`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)} год`;
  if (minutes < 10_080) return `${Math.floor(minutes / 1_440)} дн`;
  return dateFormat.format(date);
}

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    text-decoration: none;

    &,
    &:link,
    &:visited,
    &:hover,
    &:focus,
    &:active {
      color: ${token.colorTextSecondary};
    }

    &:hover {
      background: ${token.colorFillTertiary};
    }

    &:focus-visible {
      outline: none;
      box-shadow: inset 0 0 0 2px ${token.colorPrimaryBorder};
    }

    @media (max-width: ${token.screenMD}px) {
      min-height: 64px;
      gap: 12px;
      padding: 6px 12px;
    }
  `,
  active: css`
    background: ${token.colorPrimaryBg};

    &:hover {
      background: ${token.colorPrimaryBgHover};
    }
  `,
  body: css`
    flex: 1;
    min-width: 0;
  `,
  name: css`
    display: block;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: ${token.colorTextSecondary};
    font-weight: 500;

    @media (max-width: ${token.screenMD}px) {
      color: ${token.colorText};
      font-size: 16px;
      line-height: 24px;
      font-weight: 600;
    }
  `,
  unreadName: css`
    color: ${token.colorText};
    font-weight: 650;
  `,
  preview: css`
    display: block;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: ${token.colorTextTertiary};
    font-size: 12px;

    @media (max-width: ${token.screenMD}px) {
      color: ${token.colorTextTertiary};
      font-size: 14px;
      line-height: 20px;
    }
  `,
  unreadPreview: css`
    color: ${token.colorTextSecondary};
    font-weight: 500;

    @media (max-width: ${token.screenMD}px) {
      color: ${token.colorTextSecondary};
    }
  `,
  badge: css`
    min-width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    padding: 0 5px;
    border-radius: 10px;
    background: ${token.colorFillSecondary};
    color: ${token.colorTextSecondary};
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
  `,
  muted: css`
    flex-shrink: 0;
    color: ${token.colorTextTertiary};
  `,
  trailing: css`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;

    @media (max-width: ${token.screenMD}px) {
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }
  `,
  time: css`
    display: none;

    @media (max-width: ${token.screenMD}px) {
      display: block;
      color: ${token.colorTextTertiary};
      font-size: 12px;
      line-height: 18px;
      white-space: nowrap;
    }
  `,
  indicators: css`
    display: flex;
    align-items: center;
    gap: 4px;
  `,
}));

export function DirectMessageRow({
  item,
  unreadCount,
  onNavigate,
}: {
  item: DirectMessage;
  unreadCount: number;
  onNavigate?: () => void;
}) {
  const { styles, cx } = useStyles();
  const isMobile = useIsMobile();
  // The panel renders outside the route tree, so the open conversation comes from the URL.
  const isActive = useMatch('/direct/:channelId')?.params.channelId === item.id;
  const visibleUnreadCount = isActive ? 0 : unreadCount;
  const isMuted = item.notification.isMuted;
  let preview = 'Нова розмова';
  if (item.lastMessage) {
    preview = item.lastMessage.markdown
      ? item.lastMessage.markdown
          .replace(/:member\[[0-9a-f-]{36}\]/gi, '@учасник')
          .replace(/\s+/gu, ' ')
      : item.lastMessage.markdown === null
        ? 'Повідомлення видалено'
        : 'Вкладення';
  }
  return (
    <Link
      to={`/direct/${item.id}`}
      onClick={onNavigate}
      className={cx(styles.row, isActive && styles.active)}
    >
      <Avatar
        path={item.participant.avatarPath}
        alt={item.participant.displayName ?? 'Колега'}
        size={isMobile ? 44 : 36}
        shape="circle"
      />
      <span className={styles.body}>
        <span className={cx(styles.name, visibleUnreadCount > 0 && styles.unreadName)}>
          {item.participant.displayName ?? 'Ім’я недоступне'}
        </span>
        <span className={cx(styles.preview, visibleUnreadCount > 0 && styles.unreadPreview)}>
          {preview}
        </span>
      </span>
      {(item.lastMessage || isMuted || visibleUnreadCount > 0) && (
        <span className={styles.trailing}>
          {item.lastMessage && visibleUnreadCount === 0 && (
            <time className={styles.time} dateTime={item.lastMessage.createdAt}>
              {formatRecentTime(item.lastMessage.createdAt)}
            </time>
          )}
          {(isMuted || visibleUnreadCount > 0) && (
            <span className={styles.indicators}>
              {isMuted && (
                <BellSlashIcon
                  size={18}
                  className={styles.muted}
                  aria-label="Сповіщення вимкнено"
                />
              )}
              {visibleUnreadCount > 0 && (
                <span className={styles.badge} aria-label={`${visibleUnreadCount} непрочитаних`}>
                  {visibleUnreadCount > 99 ? '99+' : visibleUnreadCount}
                </span>
              )}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
