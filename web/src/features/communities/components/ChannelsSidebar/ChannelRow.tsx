import { GearSixIcon, HashIcon, LockSimpleIcon, UserPlusIcon } from '@phosphor-icons/react';
import { Popover, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { IconButton } from '@/shared/ui/IconButton';

import { canManageChannel } from '../../channel-permissions';
import { ChannelFormModal } from '../../channels/components/ChannelFormModal';
import type { Channel } from '../../channels/types';
import { AddChannelMemberControl } from '../../memberships/components/AddChannelMemberControl';
import { useChannelsSidebarStore } from './channels-sidebar-context';

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    position: relative;
    display: flex;
    align-items: center;
    gap: 0;
    margin: 2px 4px;
    min-height: 36px;
    border-radius: ${token.borderRadius}px;
    color: ${token.colorTextSecondary};
    font-weight: 500;

    &:hover {
      background: ${token.colorFillTertiary};
      color: ${token.colorText};
    }

    @media (max-width: ${token.screenMD}px) {
      margin-inline: 4px;
    }
  `,
  rowWithActions: css`
    &:hover [data-role='row-actions'],
    &:focus-within [data-role='row-actions'] {
      opacity: 1;
      pointer-events: auto;
    }

    &:hover [data-role='unread-badge'],
    &:focus-within [data-role='unread-badge'] {
      opacity: 0;
    }

    @media (hover: none) {
      &:hover [data-role='unread-badge'],
      &:focus-within [data-role='unread-badge'] {
        opacity: 1;
      }
    }
  `,
  rowActive: css`
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimaryTextActive};

    &:hover {
      background: ${token.colorPrimaryBgHover};
      color: ${token.colorPrimaryTextActive};
    }
  `,
  dragging: css`
    opacity: 0.5;
  `,
  link: css`
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    padding: 2px 8px;
    text-decoration: none;

    &::after {
      content: '';
      position: absolute;
      inset: 0;
    }

    /* A react-router Link renders a real <a href>, whose UA :link/:visited
       rules carry more specificity than a plain class — restate color on
       every link pseudo-state so it always inherits the row's color instead
       of the browser's default (visited) link blue. */
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

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 2px;
      border-radius: ${token.borderRadius}px;
    }
  `,
  icon: css`
    flex-shrink: 0;
    opacity: 0.8;
  `,
  name: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: ${token.fontSize}px;
  `,
  unread: css`
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: ${token.colorError};
    color: ${token.colorWhite};
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    transition: opacity 0.15s ease;

    @media (hover: none) {
      position: static;
      transform: none;
    }
  `,
  trailing: css`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-width: 18px;
    height: 28px;
    margin-right: 8px;
    pointer-events: none;

    @media (hover: none) {
      gap: 6px;
    }
  `,
  actions: css`
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 1px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;

    @media (hover: none) {
      opacity: 1;
      pointer-events: auto;
    }
  `,
  action: css`
    background: transparent;
    color: ${token.colorTextSecondary};

    &&:hover:not(:disabled),
    &&:focus:not(:disabled) {
      background: transparent;
      color: ${token.colorPrimary};
    }
  `,
}));

interface ChannelRowProps {
  channel: Channel;
}

export function ChannelRow({ channel }: ChannelRowProps) {
  const { styles, cx } = useStyles();
  const {
    workspaceId,
    currentMember,
    selectedChannelId,
    unreadByChannel,
    onNavigate,
    setDraggingChannel,
    draggingChannel,
  } = useChannelsSidebarStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isActive = channel.id === selectedChannelId;
  const canAddMember = channel.isMember;
  const canManage = canManageChannel(channel, currentMember);
  const unreadCount = isActive ? 0 : (unreadByChannel.get(channel.id) ?? 0);
  const hasActions = canAddMember || canManage;

  return (
    <div
      className={cx(
        styles.row,
        isActive && styles.rowActive,
        hasActions && styles.rowWithActions,
        draggingChannel?.id === channel.id && styles.dragging,
      )}
      draggable={canManage}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', channel.id);
        setDraggingChannel(channel);
      }}
      onDragEnd={() => setDraggingChannel(null)}
    >
      <Link to={`/channels/${channel.id}`} onClick={onNavigate} className={styles.link}>
        {channel.kind === 'private' ? (
          <LockSimpleIcon size={16} className={styles.icon} />
        ) : (
          <HashIcon size={16} className={styles.icon} />
        )}
        <span className={styles.name}>{channel.name}</span>
      </Link>
      {(unreadCount > 0 || hasActions) && (
        <div className={styles.trailing}>
          {unreadCount > 0 && (
            <span
              className={styles.unread}
              data-role="unread-badge"
              aria-label={`${unreadCount} непрочитаних`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          {hasActions && (
            <div className={styles.actions} data-role="row-actions">
              {canAddMember && (
                <Popover
                  trigger="click"
                  placement="right"
                  content={<AddChannelMemberControl workspaceId={workspaceId} channel={channel} />}
                >
                  <Tooltip title="Додати учасника">
                    <IconButton
                      size={28}
                      className={styles.action}
                      aria-label={`Додати учасника до ${channel.name}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <UserPlusIcon size={16} />
                    </IconButton>
                  </Tooltip>
                </Popover>
              )}
              {canManage && (
                <Tooltip title="Налаштування каналу">
                  <IconButton
                    size={28}
                    className={styles.action}
                    aria-label={`Налаштування каналу ${channel.name}`}
                    onClick={() => setSettingsOpen(true)}
                  >
                    <GearSixIcon size={16} />
                  </IconButton>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      )}
      {canManage && (
        <ChannelFormModal
          workspaceId={workspaceId}
          channel={channel}
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
