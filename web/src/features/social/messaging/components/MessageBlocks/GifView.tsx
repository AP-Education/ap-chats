import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { mediaKey, useMediaViewer } from '../../media-viewer-context';
import type { GifBlock } from '../../types';
import { MediaFrame } from '../MediaFrame/MediaFrame';
import { GifLink } from './GifLink';
import styles from './GifView.module.css';

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
  const { t } = useTranslation('messaging');
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
        aria-label={t(($) => $.message.viewGif, { title: block.title || 'GIF' })}
        onClick={() => viewer.open(key)}
      />
      <span className={styles.label} aria-hidden>
        GIF
      </span>
      {overlay}
    </MediaFrame>
  );
}
