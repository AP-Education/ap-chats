import { ClockIcon, PushPinIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

import { useMessageActionScope } from './MessageActionScope';

const timeFormat = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });
const fullFormat = new Intl.DateTimeFormat('uk-UA', { dateStyle: 'long', timeStyle: 'short' });

const useStyles = createStyles(({ css }) => ({
  // Floated after the last line of text: it shares that line while there is room and
  // drops to its own line otherwise, the way chat bubbles keep the time in the corner.
  meta: css`
    position: relative;
    top: 6px;
    float: right;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    height: 18px;
    margin: 0 -3px 0 12px;
    color: var(--bubble-meta);
    font-size: 12px;
    line-height: 18px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    user-select: none;
    -webkit-user-select: none;
  `,
  block: css`
    top: 0;
    float: none;
    display: flex;
    justify-content: flex-end;
    margin: 2px -3px -2px 12px;
  `,
  // Over a photo, and under a jumbo emoji that has no bubble behind it.
  badge: css`
    top: auto;
    float: none;
    display: flex;
    width: fit-content;
    margin: 0;
    padding: 0 7px;
    border-radius: 9px;
    background: var(--chat-service-strong, rgba(0, 0, 0, 0.45));
    color: #fff;
  `,
  overlay: css`
    position: absolute;
    right: 10px;
    bottom: 10px;
  `,
  standalone: css`
    margin: 4px 0 0 auto;
  `,
  failed: css`
    color: var(--bubble-accent);
  `,
}));

export type MessageMetaPlacement = 'inline' | 'block' | 'overlay' | 'standalone';

export function MessageMeta({ placement }: { placement: MessageMetaPlacement }) {
  const { styles, cx } = useStyles();
  const { item, delivery } = useMessageActionScope();
  const createdAt = new Date(item.message.createdAt);
  const editedAt = item.message.editedAt ? new Date(item.message.editedAt) : null;
  const sending = delivery === 'sending' || delivery === 'uploading';

  return (
    <span
      className={cx(
        styles.meta,
        placement === 'block' && styles.block,
        (placement === 'overlay' || placement === 'standalone') && styles.badge,
        placement === 'overlay' && styles.overlay,
        placement === 'standalone' && styles.standalone,
      )}
    >
      {item.pin && <PushPinIcon size={12} weight="fill" aria-label="Закріплено" />}
      {editedAt && <span title={`Відредаговано ${fullFormat.format(editedAt)}`}>ред.</span>}
      <time dateTime={item.message.createdAt} title={fullFormat.format(createdAt)}>
        {timeFormat.format(createdAt)}
      </time>
      {sending && <ClockIcon size={13} aria-label="Надсилається" />}
      {delivery === 'failed' && (
        <WarningCircleIcon
          size={14}
          weight="fill"
          className={styles.failed}
          aria-label="Не надіслано"
        />
      )}
    </span>
  );
}
