import { IconButton } from '@ap-education/ui';
import { CalendarDotsIcon, PaperPlaneRightIcon, TrashIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import { MessagePreview } from '@/features/social/messaging/components/MessagePreview/MessagePreview';
import { useChatsLanguage } from '@/shared/i18n/useChatsLanguage';

import { sendTimeHeading, sendTimeLabel } from '../../send-times';
import type { ScheduledMessage } from '../../types';

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 4px 8px 10px;
    border-radius: ${token.borderRadiusSM}px;

    &:hover {
      background: ${token.colorFillQuaternary};
    }
  `,
  body: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  `,
  when: css`
    color: ${token.colorPrimary};
    font-size: 12px;
    font-weight: 650;

    &[data-failed] {
      color: ${token.colorError};
    }
  `,
  excerpt: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  actions: css`
    display: flex;
    flex-shrink: 0;
    color: ${token.colorTextSecondary};
  `,
}));

interface ScheduledMessageRowProps {
  message: ScheduledMessage;
  now: Date;
  busy: boolean;
  onSendNow: () => void;
  onReschedule: () => void;
  onCancel: () => void;
}

export function ScheduledMessageRow({
  message,
  now,
  busy,
  onSendNow,
  onReschedule,
  onCancel,
}: ScheduledMessageRowProps) {
  const { styles } = useStyles();
  const { t } = useTranslation(['scheduling', 'common']);
  const locale = useChatsLanguage();
  const sendAt = new Date(message.sendAt);
  const when = message.failure
    ? t(($) => $.failedToSendAt, { when: sendTimeLabel(sendAt, now, t, locale) })
    : sendTimeHeading(sendAt, now, t, locale);

  return (
    <div className={styles.row}>
      <div className={styles.body}>
        <span className={styles.when} data-failed={message.failure ? true : undefined}>
          {when}
        </span>
        <span className={styles.excerpt}>
          <MessagePreview markdown={message.markdown} />
        </span>
      </div>
      <div className={styles.actions}>
        <IconButton size={32} aria-label={t(($) => $.sendNow)} disabled={busy} onClick={onSendNow}>
          <PaperPlaneRightIcon size={18} />
        </IconButton>
        <IconButton
          size={32}
          aria-label={t(($) => $.changeTime)}
          disabled={busy}
          onClick={onReschedule}
        >
          <CalendarDotsIcon size={18} />
        </IconButton>
        <IconButton
          size={32}
          aria-label={t(($) => $.common.actions.cancel)}
          disabled={busy}
          onClick={onCancel}
        >
          <TrashIcon size={18} />
        </IconButton>
      </div>
    </div>
  );
}
