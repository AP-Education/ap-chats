import { PushPinIcon } from '@phosphor-icons/react';

import { DeliveryMark } from './DeliveryMark';
import { useMessageActionScope } from './MessageActionScope';
import styles from './MessageMeta.module.css';

const timeFormat = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });
const fullFormat = new Intl.DateTimeFormat('uk-UA', { dateStyle: 'long', timeStyle: 'short' });

export type MessageMetaPlacement = 'inline' | 'block' | 'overlay' | 'emoji' | 'reactions';

export function MessageMeta({ placement }: { placement: MessageMetaPlacement }) {
  const { item, delivery, isOwn } = useMessageActionScope();
  const createdAt = new Date(item.message.createdAt);
  const editedAt = item.message.editedAt ? new Date(item.message.editedAt) : null;

  return (
    <span className={styles.meta} data-placement={placement}>
      {item.pin && <PushPinIcon size={12} weight="fill" aria-label="Закріплено" />}
      {editedAt && <span title={`Відредаговано ${fullFormat.format(editedAt)}`}>ред.</span>}
      <time dateTime={item.message.createdAt} title={fullFormat.format(createdAt)}>
        {timeFormat.format(createdAt)}
      </time>
      {isOwn && <DeliveryMark delivery={delivery} seq={item.seq} />}
    </span>
  );
}
