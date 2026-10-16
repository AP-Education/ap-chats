import { message as toast } from 'antd';
import { createStyles } from 'antd-style';

import { ApiError } from '@/shared/api/http';

import { useScheduling } from '../../hooks/useScheduling';
import type { ScheduledMessage } from '../../types';
import { ScheduledMessageRow } from './ScheduledMessageRow';

const useStyles = createStyles(({ token, css }) => ({
  list: css`
    width: min(360px, 80vw);
    max-height: 360px;
    overflow-y: auto;

    @media (max-width: ${token.screenMD}px) {
      width: auto;
      max-height: none;
    }
  `,
}));

// Gone means it has just gone out on time, which the history already shows.
function unlessGone(failure: string) {
  return (error: Error) => {
    const isGone = error instanceof ApiError && error.status === 404;
    if (!isGone) toast.error(failure);
  };
}

interface ScheduledMessagesProps {
  messages: ScheduledMessage[];
  onReschedule: (message: ScheduledMessage) => void;
}

export function ScheduledMessages({ messages, onReschedule }: ScheduledMessagesProps) {
  const { styles } = useStyles();
  const { sendNow, cancel } = useScheduling();
  const now = new Date();

  const isBusy = (message: ScheduledMessage) =>
    (sendNow.isPending && sendNow.variables.id === message.id) ||
    (cancel.isPending && cancel.variables.id === message.id);

  return (
    <div className={styles.list}>
      {messages.map((message) => (
        <ScheduledMessageRow
          key={message.id}
          message={message}
          now={now}
          busy={isBusy(message)}
          onSendNow={() =>
            sendNow.mutate(message, { onError: unlessGone('Не вдалося надіслати повідомлення.') })
          }
          onReschedule={() => onReschedule(message)}
          onCancel={() =>
            cancel.mutate(message, { onError: unlessGone('Не вдалося скасувати повідомлення.') })
          }
        />
      ))}
    </div>
  );
}
