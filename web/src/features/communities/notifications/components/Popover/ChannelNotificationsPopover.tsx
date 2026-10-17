import { IconButton } from '@ap-education/ui';
import { BellIcon, BellSlashIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { Popover } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { workspaceNotificationsQuery } from '../../hooks/useWorkspaceNotifications';
import { NotificationsMenu } from '../NotificationsMenu/NotificationsMenu';
import { channelSubject } from '../NotificationsMenu/subjects';
import { useChannelNotificationPreference } from './useChannelNotificationPreference';

const useStyles = createStyles(({ token, css }) => ({
  trigger: css`
    color: ${token.colorTextSecondary};
  `,
  triggerActive: css`
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimaryTextActive};
  `,
  menu: css`
    width: 220px;
  `,
}));

interface ChannelNotificationsPopoverProps {
  workspaceId: string;
  channelId: string;
  compact?: boolean;
}

export function ChannelNotificationsPopover({
  workspaceId,
  channelId,
  compact = false,
}: ChannelNotificationsPopoverProps) {
  const { styles, cx } = useStyles();
  const { token, identity } = useQueryAuth();
  const preference = useChannelNotificationPreference(workspaceId, channelId);
  const { data: workspace } = useQuery(workspaceNotificationsQuery(identity, token, workspaceId));
  const [open, setOpen] = useState(false);

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      styles={{ content: { padding: 4 } }}
      open={open}
      onOpenChange={setOpen}
      destroyOnHidden
      content={
        <div className={styles.menu} role="dialog" aria-label="Сповіщення каналу">
          <NotificationsMenu
            subject={channelSubject(workspace?.settings)}
            preference={preference}
            onDone={() => setOpen(false)}
          />
        </div>
      }
    >
      <IconButton
        size={compact ? 40 : 36}
        className={cx(styles.trigger, (open || preference.isMuted) && styles.triggerActive)}
        aria-label="Сповіщення каналу"
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={preference.changing}
      >
        {preference.isMuted ? <BellSlashIcon size={22} weight="duotone" /> : <BellIcon size={22} />}
      </IconButton>
    </Popover>
  );
}
