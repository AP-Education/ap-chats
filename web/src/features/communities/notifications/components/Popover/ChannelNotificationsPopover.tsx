import { BellIcon, BellSlashIcon } from '@phosphor-icons/react';
import { Popover, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { IconButton } from '@/shared/ui/IconButton';

import { NotificationPopoverContent } from './NotificationPopoverContent';
import {
  type NotificationLevel,
  useChannelNotificationPreference,
} from './useChannelNotificationPreference';

const useStyles = createStyles(({ token, css }) => ({
  trigger: css`
    color: ${token.colorTextSecondary};
  `,
  triggerActive: css`
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
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
  const { level, isMuted, chooseLevel, chooseMute, unmute } = useChannelNotificationPreference(
    workspaceId,
    channelId,
  );
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'levels' | 'mute'>('levels');

  function handleChooseLevel(nextLevel: NotificationLevel) {
    chooseLevel(nextLevel);
    setOpen(false);
    setView('levels');
  }

  function handleChooseMute(milliseconds: number) {
    chooseMute(milliseconds);
    setOpen(false);
    setView('levels');
  }

  function handleUnmute() {
    unmute();
    setOpen(false);
    setView('levels');
  }

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      styles={{ content: { padding: 4 } }}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setView('levels');
      }}
      content={
        <div className={styles.menu} role="dialog" aria-label="Сповіщення каналу">
          <NotificationPopoverContent
            view={view}
            level={level}
            isMuted={isMuted}
            onBack={() => setView('levels')}
            onOpenMute={() => setView('mute')}
            onUnmute={handleUnmute}
            onChooseLevel={handleChooseLevel}
            onChooseMute={handleChooseMute}
          />
        </div>
      }
    >
      <Tooltip title="Сповіщення каналу">
        <IconButton
          size={compact ? 40 : 36}
          className={cx(styles.trigger, (open || isMuted) && styles.triggerActive)}
          aria-label="Сповіщення каналу"
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          {isMuted ? <BellSlashIcon size={22} weight="duotone" /> : <BellIcon size={22} />}
        </IconButton>
      </Tooltip>
    </Popover>
  );
}
