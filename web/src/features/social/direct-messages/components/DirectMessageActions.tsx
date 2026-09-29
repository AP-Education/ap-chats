import { LoadingOutlined } from '@ant-design/icons';
import { BellIcon, BellSlashIcon, PhoneIcon, UserCircleIcon } from '@phosphor-icons/react';
import { message as toast, Popover, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { ConversationActionDivider } from '@/domain/conversation/ConversationPane';
import { callActionLabel } from '@/features/calls/callActionLabel';
import { useCallAction } from '@/features/calls/hooks/useCallAction';
import { IconButton } from '@/shared/ui/IconButton';

import type { DirectMessage } from '../api/direct-messages-api';
import { useDirectMessageMute } from '../hooks/useDirectMessageMute';

const useStyles = createStyles(({ token, css }) => ({
  action: css`
    color: ${token.colorTextSecondary};
  `,
  active: css`
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
  `,
  muteMenu: css`
    display: grid;
    min-width: 190px;
  `,
  muteOption: css`
    padding: 8px 10px;
    border: 0;
    border-radius: ${token.borderRadius}px;
    background: transparent;
    color: ${token.colorText};
    text-align: left;
    cursor: pointer;

    &:hover:not(:disabled) {
      background: ${token.colorFillTertiary};
    }
  `,
}));

interface DirectMessageActionsProps {
  workspaceId: string;
  conversation: DirectMessage;
  profileVisible: boolean;
  onToggleProfile: () => void;
  compact: boolean;
}

export function DirectMessageActions({
  workspaceId,
  conversation,
  profileVisible,
  onToggleProfile,
  compact,
}: DirectMessageActionsProps) {
  const { styles, cx } = useStyles();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const mute = useDirectMessageMute(workspaceId, conversation.id);
  const name = conversation.participant.displayName ?? 'Колега';
  const call = useCallAction(workspaceId, conversation.id, name);
  const size = compact ? 40 : 36;
  const isMuted = conversation.notification.isMuted;
  const callTitle = callActionLabel(call, `Подзвонити: ${name}`);

  function chooseMute(mode: 'unmute' | 'hour' | 'day' | 'indefinite') {
    mute.mutate(mode, {
      onSuccess: () => setNotificationsOpen(false),
      onError: () => toast.error('Не вдалося змінити сповіщення.'),
    });
  }

  return (
    <>
      <Popover
        trigger="click"
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        styles={{ content: { padding: 4 } }}
        content={
          <div className={styles.muteMenu} role="group" aria-label="Сповіщення розмови">
            {isMuted && (
              <button
                type="button"
                className={styles.muteOption}
                disabled={mute.isPending}
                onClick={() => chooseMute('unmute')}
              >
                Увімкнути сповіщення
              </button>
            )}
            <button
              type="button"
              className={styles.muteOption}
              disabled={mute.isPending}
              onClick={() => chooseMute('hour')}
            >
              Вимкнути на 1 годину
            </button>
            <button
              type="button"
              className={styles.muteOption}
              disabled={mute.isPending}
              onClick={() => chooseMute('day')}
            >
              Вимкнути на 24 години
            </button>
            <button
              type="button"
              className={styles.muteOption}
              disabled={mute.isPending}
              onClick={() => chooseMute('indefinite')}
            >
              Вимкнути безстроково
            </button>
          </div>
        }
      >
        <Tooltip title={isMuted ? 'Сповіщення вимкнено' : 'Сповіщення розмови'}>
          <IconButton
            size={size}
            className={cx(styles.action, (notificationsOpen || isMuted) && styles.active)}
            aria-label="Сповіщення розмови"
            aria-expanded={notificationsOpen}
          >
            {isMuted ? <BellSlashIcon size={21} weight="duotone" /> : <BellIcon size={21} />}
          </IconButton>
        </Tooltip>
      </Popover>
      <Tooltip title={callTitle}>
        <span>
          <IconButton
            size={size}
            className={cx(styles.action, (call.inCall || call.joinable) && styles.active)}
            aria-label={callTitle}
            disabled={call.busy || call.pending || !conversation.participant.active}
            onClick={call.onClick}
          >
            {call.pending ? (
              <LoadingOutlined />
            ) : (
              <PhoneIcon size={21} weight={call.joinable ? 'fill' : 'regular'} />
            )}
          </IconButton>
        </span>
      </Tooltip>
      <ConversationActionDivider />
      <Tooltip title={profileVisible ? 'Сховати профіль' : 'Показати профіль'}>
        <IconButton
          size={size}
          className={cx(styles.action, profileVisible && styles.active)}
          aria-label={profileVisible ? 'Сховати профіль' : 'Показати профіль'}
          aria-pressed={profileVisible}
          onClick={onToggleProfile}
        >
          <UserCircleIcon size={22} weight={profileVisible ? 'duotone' : 'regular'} />
        </IconButton>
      </Tooltip>
    </>
  );
}
