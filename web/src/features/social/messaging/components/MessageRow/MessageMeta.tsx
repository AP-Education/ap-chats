import {
  TimelineEntryMeta,
  TimelineEntryStatus,
  TimelineEntryTime,
} from '@ap-education/timeline/react';
import { PushPinIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

import { dateTimeFormat } from '@/shared/i18n/format';
import { useChatsLanguage } from '@/shared/i18n/useChatsLanguage';

import { intlLocale } from '../packageLabels';
import { useMessageActionScope } from './MessageActionScope';
import styles from './MessageMeta.module.css';

const fullFormat = dateTimeFormat({ dateStyle: 'long', timeStyle: 'short' });

export type MessageMetaPlacement = 'inline' | 'block' | 'overlay' | 'emoji' | 'reactions' | 'voice';

export function MessageMeta({ placement }: { placement: MessageMetaPlacement }) {
  const { t } = useTranslation('messaging');
  const locale = intlLocale(useChatsLanguage());
  const { item } = useMessageActionScope();
  const editedAt = item.message.editedAt ? new Date(item.message.editedAt) : null;

  return (
    <TimelineEntryMeta className={styles.meta} data-placement={placement}>
      {item.pin && <PushPinIcon size={12} weight="fill" aria-label={t(($) => $.message.pinned)} />}
      {editedAt && (
        <span title={t(($) => $.message.editedAt, { time: fullFormat(locale).format(editedAt) })}>
          {t(($) => $.message.edited)}
        </span>
      )}
      <TimelineEntryTime />
      {!item.message.privateToMe && <TimelineEntryStatus />}
    </TimelineEntryMeta>
  );
}
