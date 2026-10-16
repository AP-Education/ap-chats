import { createStyles } from 'antd-style';
import { type ReactNode, useState } from 'react';

import { mediaKey, useMediaViewer } from '../../media-viewer-context';
import type { GifBlock } from '../../types';
import { MediaFrame } from '../MediaFrame/MediaFrame';
import { GifLink } from './GifLink';

const useStyles = createStyles(({ token, css }) => ({
  open: css`
    position: absolute;
    inset: 0;
    padding: 0;
    border: 0;
    border-radius: inherit;
    background: none;
    cursor: zoom-in;
    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: -2px;
    }
  `,
  // Tells a GIF from a photo at a glance, as Telegram and WhatsApp mark theirs, in the GIF's own
  // colours where it has them.
  label: css`
    position: absolute;
    top: 8px;
    left: 8px;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--media-badge-start, var(--chat-service-strong, rgba(0, 0, 0, 0.45)));
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.5;
    letter-spacing: 0.04em;
    pointer-events: none;
    user-select: none;
  `,
}));

/**
 * Straight from its service's CDN; KLIPY swaps a taken-down GIF for its own notice. One that fails
 * to load at all leaves its link instead.
 */
export function GifView({
  block,
  messageId,
  overlay,
}: {
  block: GifBlock;
  messageId: string;
  overlay?: ReactNode;
}) {
  const { styles } = useStyles();
  const viewer = useMediaViewer();
  const [broken, setBroken] = useState(false);
  const key = mediaKey(messageId, 'gif');

  if (broken) {
    return (
      <>
        <GifLink href={block.link} />
        {overlay}
      </>
    );
  }

  return (
    <MediaFrame
      src={block.media.url}
      size={block.media}
      alt={block.title || 'GIF'}
      placeholder={block.media.placeholder}
      onImageError={() => setBroken(true)}
      data-attachment-media
      data-media-key={key}
    >
      <button
        type="button"
        className={styles.open}
        aria-label={`Переглянути ${block.title || 'GIF'}`}
        onClick={() => viewer.open(key)}
      />
      <span className={styles.label} aria-hidden>
        GIF
      </span>
      {overlay}
    </MediaFrame>
  );
}
