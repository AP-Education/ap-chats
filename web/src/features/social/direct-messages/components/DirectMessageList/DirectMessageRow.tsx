import { useShellLocale } from '@ap-education/shell-sdk';
import { useIsMobile } from '@ap-education/ui';
import { BellSlashIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Link, useMatch } from 'react-router-dom';

import { previewText } from '@/features/social/mentions/mention-tokens';
import { isLoneGif } from '@/features/social/messaging/gifs/gif-links';
import { usePrefetchHistory } from '@/features/social/messaging/hooks';
import { dateTimeFormat } from '@/shared/i18n/format';
import { Avatar } from '@/shared/ui/Avatar';

import type { DirectMessage } from '../../api/direct-messages-api';

function lastMessagePreview(
  message: NonNullable<DirectMessage['lastMessage']>,
  t: TFunction<'directMessages'>,
  mentionsT: TFunction<'mentions'>,
): string {
  if (message.markdown === null) return t(($) => $.row.messageDeleted);
  if (!message.markdown) return t(($) => $.row.attachment);
  return isLoneGif(message) ? 'GIF' : previewText(message.markdown, mentionsT);
}

const dateFormat = dateTimeFormat({ day: 'numeric', month: 'numeric' });

function formatRecentTime(value: string, t: TFunction<'directMessages'>, locale: string) {
  const date = new Date(value);
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (minutes < 1) return t(($) => $.row.justNow);
  if (minutes < 60) return t(($) => $.row.minutesAgo, { minutes });
  if (minutes < 1_440) return t(($) => $.row.hoursAgo, { hours: Math.floor(minutes / 60) });
  if (minutes < 10_080) return t(($) => $.row.daysAgo, { days: Math.floor(minutes / 1_440) });
  return dateFormat(locale).format(date);
}

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 1px 8px;
    padding: 8px;
    border-radius: ${token.borderRadius}px;
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
      padding: 6px 8px;
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
  const { t } = useTranslation('directMessages');
  const { t: mentionsT } = useTranslation('mentions');
  const locale = useShellLocale();
  const isMobile = useIsMobile();
  const prefetchHistory = usePrefetchHistory();
  // The panel renders outside the route tree, so the open conversation comes from the URL.
  const isActive = useMatch('/direct/:channelId')?.params.channelId === item.id;
  const visibleUnreadCount = isActive ? 0 : unreadCount;
  const isMuted = item.notification.isMuted;
  const preview = item.lastMessage
    ? lastMessagePreview(item.lastMessage, t, mentionsT)
    : t(($) => $.row.newConversation);
  return (
    <Link
      to={`/direct/${item.id}`}
      onClick={() => {
        prefetchHistory(item.workspaceId, item.id);
        onNavigate?.();
      }}
      className={cx(styles.row, isActive && styles.active)}
    >
      <Avatar
        path={item.participant.avatarPath}
        alt={item.participant.displayName ?? t(($) => $.colleague)}
        size={isMobile ? 44 : 36}
        shape="circle"
      />
      <span className={styles.body}>
        <span className={cx(styles.name, visibleUnreadCount > 0 && styles.unreadName)}>
          {item.participant.displayName ?? t(($) => $.nameUnavailable)}
        </span>
        <span className={cx(styles.preview, visibleUnreadCount > 0 && styles.unreadPreview)}>
          {preview}
        </span>
      </span>
      {(item.lastMessage || isMuted || visibleUnreadCount > 0) && (
        <span className={styles.trailing}>
          {item.lastMessage && visibleUnreadCount === 0 && (
            <time className={styles.time} dateTime={item.lastMessage.createdAt}>
              {formatRecentTime(item.lastMessage.createdAt, t, locale)}
            </time>
          )}
          {(isMuted || visibleUnreadCount > 0) && (
            <span className={styles.indicators}>
              {isMuted && (
                <BellSlashIcon
                  size={18}
                  className={styles.muted}
                  aria-label={t(($) => $.row.notificationsOff)}
                />
              )}
              {visibleUnreadCount > 0 && (
                <span
                  className={styles.badge}
                  aria-label={t(($) => $.unread.badgeLabel, { unread: visibleUnreadCount })}
                >
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
