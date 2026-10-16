import { IconButton } from '@ap-education/ui';
import { XIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';

import { formatDayLabel } from '@/features/social/messaging/components/MessageTimeline/timeline-days';
import { Avatar } from '@/shared/ui/Avatar';

import type { ViewerMedia } from '../../types';

const timeFormat = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });

const useStyles = createStyles(({ token, css }) => ({
  // Shown and hidden with PhotoSwipe's own controls, which a tap on the photo toggles.
  bar: css`
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: ${token.paddingXS}px;
    padding: max(${token.paddingXS}px, env(safe-area-inset-top)) ${token.paddingSM}px
      ${token.paddingLG}px;
    background: linear-gradient(rgba(0, 0, 0, 0.6), transparent);
    color: #fff;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;

    .pswp--ui-visible & {
      opacity: 1;
      pointer-events: auto;
    }
  `,
  author: css`
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    margin-right: auto;
    padding: 4px 12px 4px 4px;
    border: 0;
    border-radius: 999px;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
    }
  `,
  who: css`
    display: flex;
    flex-direction: column;
    min-width: 0;
  `,
  name: css`
    overflow: hidden;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  date: css`
    color: rgba(255, 255, 255, 0.64);
    font-size: 12px;
  `,
  counter: css`
    margin-right: ${token.paddingXS}px;
    color: rgba(255, 255, 255, 0.72);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  `,
  // Discord's floating toolbar: the tools in one group, closing apart from them.
  group: css`
    display: flex;
    gap: 2px;
    padding: 4px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    background: rgba(30, 31, 34, 0.86);
    backdrop-filter: blur(12px);

    button {
      color: rgba(255, 255, 255, 0.86);
    }
    button:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }
  `,
}));

interface ViewerTopBarProps {
  media: ViewerMedia;
  /** The viewer's tools, on a wide screen; a phone has them at the bottom, under the thumb. */
  tools: ReactNode;
  onClose: () => void;
  onShowInChat: () => void;
}

/** Who sent the media and when, which leads back to the message, and the way out. */
export function ViewerTopBar({ media, tools, onClose, onShowInChat }: ViewerTopBarProps) {
  const { styles } = useStyles();
  const { author, createdAt } = media.item;
  const { index, total } = media.position;
  const name = author.displayName ?? 'Ім’я недоступне';
  const sentAt = new Date(createdAt);

  return (
    <header className={styles.bar}>
      <button
        type="button"
        className={styles.author}
        onClick={onShowInChat}
        title="Показати в чаті"
      >
        <Avatar path={author.avatarPath} alt={name} size={36} shape="circle" />
        <span className={styles.who}>
          <span className={styles.name}>{name}</span>
          <time className={styles.date} dateTime={createdAt}>
            {formatDayLabel(sentAt)} о {timeFormat.format(sentAt)}
          </time>
        </span>
      </button>
      {total > 1 && (
        <span className={styles.counter}>
          {index + 1} з {total}
        </span>
      )}
      {tools && <div className={styles.group}>{tools}</div>}
      <div className={styles.group}>
        <IconButton size={40} aria-label="Закрити" onClick={onClose}>
          <XIcon size={22} />
        </IconButton>
      </div>
    </header>
  );
}
