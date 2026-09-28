import { BellSlashIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import { Link, useParams } from 'react-router-dom';

import { Avatar } from '@/shared/ui/Avatar/Avatar';

import type { DirectMessage } from '../../api/direct-messages-api';

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
      outline: 2px solid ${token.colorPrimary};
      outline-offset: -2px;
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
  `,
  unreadPreview: css`
    color: ${token.colorTextSecondary};
    font-weight: 500;
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
  const { channelId } = useParams<{ channelId: string }>();
  const isActive = channelId === item.id;
  const visibleUnreadCount = isActive ? 0 : unreadCount;
  const isMuted = item.notification.isMuted;
  let preview = 'Нова розмова';
  if (item.lastMessage) {
    preview = item.lastMessage.markdown
      ? item.lastMessage.markdown
          .replace(/:member\[[0-9a-f-]{36}\]/gi, '@учасник')
          .replace(/\s+/gu, ' ')
      : 'Повідомлення видалено';
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
        size={36}
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
      {isMuted && (
        <BellSlashIcon size={16} className={styles.muted} aria-label="Сповіщення вимкнено" />
      )}
      {visibleUnreadCount > 0 && (
        <span className={styles.badge} aria-label={`${visibleUnreadCount} непрочитаних`}>
          {visibleUnreadCount > 99 ? '99+' : visibleUnreadCount}
        </span>
      )}
    </Link>
  );
}
