import type { ReactNode } from 'react';

import type { Attachment } from '../../attachments/types';
import { albumLayout } from '../../media/album-layout';
import { AlbumTile } from './AlbumTile';
import { attachmentSize } from './attachment-size';
import styles from './AttachmentAlbum.module.css';

interface AttachmentAlbumProps {
  images: Attachment[];
  messageId: string;
  available: boolean;
  /** The time, when the album closes the bubble. */
  overlay?: ReactNode;
}

/** Several photos as one album, each at close to its own proportions, as Telegram groups them. */
export function AttachmentAlbum({ images, messageId, available, overlay }: AttachmentAlbumProps) {
  const album = albumLayout(images.map(attachmentSize));

  return (
    <div
      className={styles.album}
      style={{ width: album.width, aspectRatio: `${album.width} / ${album.height}` }}
      data-attachment-media
    >
      {images.map((image, index) => (
        <AlbumTile
          key={image.id}
          attachment={image}
          messageId={messageId}
          available={available}
          album={album}
          tile={album.tiles[index]!}
        />
      ))}
      {overlay}
    </div>
  );
}
