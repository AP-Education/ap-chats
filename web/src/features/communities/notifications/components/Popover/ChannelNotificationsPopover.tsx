import { BellIcon, BellSlashIcon } from '@phosphor-icons/react';
import { App, Button, Popover, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { IconButton } from '@/shared/ui/IconButton';

import type { NotificationLevel } from '../../types';
import { NotificationPopoverContent } from './NotificationPopoverContent';
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
  const { message } = App.useApp();
  const { level, isMuted, isLoading, isError, isPending, retry, chooseLevel, chooseMute, unmute } =
    useChannelNotificationPreference(workspaceId, channelId);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'levels' | 'mute'>('levels');

  async function applyChange(change: () => Promise<unknown>) {
    try {
      await change();
      setOpen(false);
      setView('levels');
    } catch {
      void message.error('Не вдалося оновити сповіщення каналу.');
    }
  }

  function handleChooseMute(milliseconds: number) {
    void applyChange(() => chooseMute(milliseconds));
  }

  function handleUnmute() {
    void applyChange(unmute);
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
          {isLoading ? (
            <Spin size="small" />
          ) : isError ? (
            <Button type="link" onClick={() => void retry()}>
              Повторити завантаження
            </Button>
          ) : (
            <NotificationPopoverContent
              view={view}
              level={level}
              isMuted={isMuted}
              onBack={() => setView('levels')}
              onOpenMute={() => setView('mute')}
              onUnmute={handleUnmute}
              onChooseLevel={(nextLevel: NotificationLevel) =>
                void applyChange(() => chooseLevel(nextLevel))
              }
              onChooseMute={handleChooseMute}
            />
          )}
        </div>
      }
    >
      <IconButton
        size={compact ? 40 : 36}
        className={cx(styles.trigger, (open || isMuted) && styles.triggerActive)}
        aria-label="Сповіщення каналу"
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={isPending}
      >
        {isMuted ? <BellSlashIcon size={22} weight="duotone" /> : <BellIcon size={22} />}
      </IconButton>
    </Popover>
  );
}
