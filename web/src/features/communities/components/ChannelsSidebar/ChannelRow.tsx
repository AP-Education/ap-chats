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
    display: flex;
    align-items: center;
    gap: 2px;
    margin: 2px 4px;
    padding: 0 8px;
    min-height: 32px;
    border-radius: ${token.borderRadius}px;
    color: ${token.colorTextSecondary};

    &:hover {
      background: ${token.colorFillTertiary};
      color: ${token.colorText};
    }

    &:hover [data-role='row-action'],
    &:focus-within [data-role='row-action'] {
      opacity: 1;
    }

    @media (max-width: ${token.screenMD}px) {
      margin-inline: 4px;
    }
  `,
  rowActive: css`
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimaryTextActive};
    font-weight: 600;

    &:hover {
      background: ${token.colorPrimaryBgHover};
      color: ${token.colorPrimaryTextActive};
    }

    [data-role='row-action'] {
      opacity: 1;
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
    padding: 0;
    text-decoration: none;

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
  archived: css`
    color: ${token.colorTextTertiary};
    text-decoration: line-through;
  `,
  action: css`
    background: transparent;
    color: ${token.colorTextSecondary};
    opacity: 0;

    &&:hover:not(:disabled),
    &&:focus:not(:disabled) {
      background: transparent;
      color: ${token.colorPrimary};
    }

    @media (hover: none) {
      opacity: 1;
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
    onNavigate,
    setDraggingChannel,
    draggingChannel,
  } = useChannelsSidebarStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isActive = channel.id === selectedChannelId;
  const isArchived = Boolean(channel.archivedAt);
  const canAddMember = channel.isMember && !isArchived;
  const canManage = canManageChannel(channel, currentMember);

  return (
    <div
      className={cx(
        styles.row,
        isActive && styles.rowActive,
        draggingChannel?.id === channel.id && styles.dragging,
      )}
      draggable={canManage && !isArchived}
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
        <span className={cx(styles.name, isArchived && styles.archived)}>{channel.name}</span>
      </Link>
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
              data-role="row-action"
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
            data-role="row-action"
            aria-label={`Налаштування каналу ${channel.name}`}
            onClick={() => setSettingsOpen(true)}
          >
            <GearSixIcon size={16} />
          </IconButton>
        </Tooltip>
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
