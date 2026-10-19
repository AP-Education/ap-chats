import type { Attachment } from '../../attachments/types';
import type { Album, Tile } from '../../media/album-layout';
import { mediaKey, useMediaViewer } from '../../media-viewer-context';
import styles from './AlbumTile.module.css';
import { ImageStatus } from './ImageStatus';
import { useAttachmentImage } from './useAttachmentAccess';

interface AlbumTileProps {
  attachment: Attachment;
  messageId: string;
  available: boolean;
  album: Album;
  tile: Tile;
}

const percent = (part: number, whole: number) => `${(part / whole) * 100}%`;

/** One photo of an album, placed by the album's layout in shares of its box. */
export function AlbumTile({ attachment, messageId, available, album, tile }: AlbumTileProps) {
  const viewer = useMediaViewer();
  const key = mediaKey(messageId, attachment.id);
  const { observeElement, src, broken, markBroken, retry } = useAttachmentImage(
    messageId,
    attachment.id,
    available,
  );
  const label = attachment.description || attachment.name;

  return (
    <button
      ref={observeElement}
      type="button"
      className={styles.tile}
      style={{
        left: percent(tile.x, album.width),
        top: percent(tile.y, album.height),
        width: percent(tile.width, album.width),
        height: percent(tile.height, album.height),
      }}
      disabled={!available}
      aria-label={`${broken ? 'Повторити перегляд' : 'Переглянути'} ${attachment.name}`}
      title={label}
      onClick={broken ? retry : () => viewer.open(key)}
      data-media-key={key}
    >
      {src ? (
        <img
          src={src}
          loading="lazy"
          decoding="async"
          alt={label}
          referrerPolicy="no-referrer"
          onError={markBroken}
        />
      ) : (
        <ImageStatus broken={broken} />
      )}
    </button>
  );
}
