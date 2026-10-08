import { LoadingIcon, PageAction, PageActionDivider, PageAsideTrigger } from '@ap-education/ui';
import { BellIcon, BellSlashIcon, UserCircleIcon } from '@phosphor-icons/react';
import { message as toast, Popover } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { callActionLabel } from '@/features/calls/callActionLabel';
import { CallIcon } from '@/features/calls/callIcons';
import { useCallAction } from '@/features/calls/hooks/useCallAction';

import type { DirectMessage } from '../api/direct-messages-api';
import { useDirectMessageMute } from '../hooks/useDirectMessageMute';

const useStyles = createStyles(({ token, css }) => ({
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
}

export function DirectMessageActions({ workspaceId, conversation }: DirectMessageActionsProps) {
  const { styles } = useStyles();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const mute = useDirectMessageMute(workspaceId, conversation.id);
  const name = conversation.participant.displayName ?? 'Колега';
  const call = useCallAction(
    workspaceId,
    conversation.id,
    name,
    conversation.participant.avatarPath,
  );
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
        <PageAction
          active={notificationsOpen || isMuted}
          aria-label="Сповіщення розмови"
          aria-expanded={notificationsOpen}
        >
          {isMuted ? <BellSlashIcon size={22} /> : <BellIcon size={22} />}
        </PageAction>
      </Popover>
      <PageAction
        active={call.inCall || call.joinable}
        aria-label={callTitle}
        disabled={call.busy || call.pending || !conversation.participant.active}
        onClick={call.onClick}
      >
        {call.pending ? <LoadingIcon size={22} /> : <CallIcon size={22} />}
      </PageAction>
      <PageActionDivider />
      <PageAsideTrigger aria-label="Профіль співрозмовника">
        <UserCircleIcon size={22} />
      </PageAsideTrigger>
    </>
  );
}
