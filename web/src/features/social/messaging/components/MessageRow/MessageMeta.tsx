import { useShellLocale } from '@ap-education/shell-sdk';
import { PushPinIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

import { dateTimeFormat } from '@/shared/i18n/format';

import { DeliveryMark } from './DeliveryMark';
import { useMessageActionScope } from './MessageActionScope';
import styles from './MessageMeta.module.css';

const timeFormat = dateTimeFormat({ hour: '2-digit', minute: '2-digit' });
const fullFormat = dateTimeFormat({ dateStyle: 'long', timeStyle: 'short' });

export type MessageMetaPlacement = 'inline' | 'block' | 'overlay' | 'emoji' | 'reactions';

export function MessageMeta({ placement }: { placement: MessageMetaPlacement }) {
  const { t } = useTranslation('messaging');
  const locale = useShellLocale();
  const { item, delivery, isOwn } = useMessageActionScope();
  const createdAt = new Date(item.message.createdAt);
  const editedAt = item.message.editedAt ? new Date(item.message.editedAt) : null;

  return (
    <span className={styles.meta} data-placement={placement}>
      {item.pin && <PushPinIcon size={12} weight="fill" aria-label={t(($) => $.message.pinned)} />}
      {editedAt && (
        <span title={t(($) => $.message.editedAt, { time: fullFormat(locale).format(editedAt) })}>
          {t(($) => $.message.edited)}
        </span>
      )}
      <time dateTime={item.message.createdAt} title={fullFormat(locale).format(createdAt)}>
        {timeFormat(locale).format(createdAt)}
      </time>
      {isOwn && <DeliveryMark delivery={delivery} seq={item.seq} />}
    </span>
  );
}
