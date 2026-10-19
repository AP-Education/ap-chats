import { useIsMobile } from '@ap-education/ui';
import { createStyles } from 'antd-style';
import { Link, useMatch } from 'react-router-dom';

import { usePrefetchHistory } from '@/features/social/messaging/hooks';
import type { ConversationAttention } from '@/features/social/read-state/conversation-attention';
import { Avatar } from '@/shared/ui/Avatar';

import type { DirectMessage } from '../../api/direct-messages-api';
import { DirectMessageMeta } from './DirectMessageMeta';
import { DirectMessageSummary } from './DirectMessageSummary';

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
}));

interface DirectMessageRowProps {
  item: DirectMessage;
  attention: ConversationAttention;
  onNavigate?: () => void;
}

/** A direct conversation in a list: opens it, and tells what is new there and meant for the person. */
export function DirectMessageRow({ item, attention, onNavigate }: DirectMessageRowProps) {
  const { styles, cx } = useStyles();
  const isMobile = useIsMobile();
  const prefetchHistory = usePrefetchHistory();
  // The panel renders outside the route tree, so the open conversation comes from the URL.
  const isActive = useMatch('/direct/:channelId')?.params.channelId === item.id;
  const isUnread = attention.unread && !isActive;
  const badge = isActive ? 0 : attention.badge;

  function open() {
    prefetchHistory(item.workspaceId, item.id);
    onNavigate?.();
  }

  return (
    <Link
      to={`/direct/${item.id}`}
      onClick={open}
      className={cx(styles.row, isActive && styles.active)}
    >
      <Avatar
        path={item.participant.avatarPath}
        alt={item.participant.displayName ?? 'Колега'}
        size={isMobile ? 44 : 36}
        shape="circle"
      />
      <DirectMessageSummary item={item} isUnread={isUnread} />
      <DirectMessageMeta item={item} badge={badge} />
    </Link>
  );
}
