import { ClockIcon, PushPinIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

import { useMessageActionScope } from './MessageActionScope';

const timeFormat = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });
const fullFormat = new Intl.DateTimeFormat('uk-UA', { dateStyle: 'long', timeStyle: 'short' });

const useStyles = createStyles(({ token, css }) => ({
  // Floated after the last line of text: it shares that line while there is room and
  // drops to its own line otherwise, the way chat bubbles keep the time in the corner.
  meta: css`
    position: relative;
    top: 6px;
    float: right;
    display: inline-flex;
    align-items: center;
    gap: ${token.paddingXXS}px;
    height: 1.5em;
    margin: 0 -${token.paddingXXS}px 0 ${token.paddingSM}px;
    color: var(--bubble-meta);
    font-size: 12px;
    line-height: 1.5;
    letter-spacing: normal;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    user-select: none;
    -webkit-user-select: none;

    // Trimmed to the cap height, the digits centre on the icons beside them instead of
    // riding above them on the room the line keeps for descenders.
    & > time,
    & > span {
      text-box: trim-both cap alphabetic;
    }

    & > svg {
      flex-shrink: 0;
    }
  `,
  block: css`
    top: 0;
    float: none;
    display: flex;
    justify-content: flex-end;
    margin: 2px -${token.paddingXXS}px -2px ${token.paddingSM}px;
  `,
  // Over a photo, and over the corner of large emoji that have no bubble behind them.
  badge: css`
    top: auto;
    float: none;
    display: flex;
    width: fit-content;
    margin: 0;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--chat-service-strong, rgba(0, 0, 0, 0.45));
    color: #fff;
  `,
  overlay: css`
    position: absolute;
    right: 10px;
    bottom: 10px;
  `,
  emoji: css`
    position: absolute;
    right: -6px;
    bottom: 2px;
    height: 1.55em;
    padding: 0 6px;
    font-size: 12px;
    line-height: 1.55;
  `,
  failed: css`
    color: var(--bubble-accent);
  `,
}));

export type MessageMetaPlacement = 'inline' | 'block' | 'overlay' | 'emoji';

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
        (placement === 'overlay' || placement === 'emoji') && styles.badge,
        placement === 'overlay' && styles.overlay,
        placement === 'emoji' && styles.emoji,
      )}
    >
      {item.pin && <PushPinIcon size={12} weight="fill" aria-label="Закріплено" />}
      {editedAt && <span title={`Відредаговано ${fullFormat.format(editedAt)}`}>ред.</span>}
      <time dateTime={item.message.createdAt} title={fullFormat.format(createdAt)}>
        {timeFormat.format(createdAt)}
      </time>
      {sending && <ClockIcon size={12} aria-label="Надсилається" />}
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
