import {
  TimelineEntryMeta,
  TimelineEntryStatus,
  TimelineEntryTime,
} from '@ap-education/timeline/react';
import { PushPinIcon } from '@phosphor-icons/react';

import { useMessageActionScope } from './MessageActionScope';
import styles from './MessageMeta.module.css';

const fullFormat = new Intl.DateTimeFormat('uk-UA', { dateStyle: 'long', timeStyle: 'short' });

export type MessageMetaPlacement = 'inline' | 'block' | 'overlay' | 'emoji' | 'reactions' | 'voice';

export function MessageMeta({ placement }: { placement: MessageMetaPlacement }) {
  const { item } = useMessageActionScope();
  const editedAt = item.message.editedAt ? new Date(item.message.editedAt) : null;

  return (
    <TimelineEntryMeta className={styles.meta} data-placement={placement}>
      {item.pin && <PushPinIcon size={12} weight="fill" aria-label="Закріплено" />}
      {editedAt && <span title={`Відредаговано ${fullFormat.format(editedAt)}`}>ред.</span>}
      <TimelineEntryTime />
      {!item.message.privateToMe && <TimelineEntryStatus />}
    </TimelineEntryMeta>
  );
}
