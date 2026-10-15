import { createStyles } from 'antd-style';

import type { Attachment } from '../../attachments/types';
import type { Album, Tile } from '../../media/album-layout';
import { ImageStatus } from './ImageStatus';
import { useAttachmentImage } from './useAttachmentAccess';

const useStyles = createStyles(({ token, css }) => ({
  tile: css`
    position: absolute;
    padding: 0;
    overflow: hidden;
    border: 0;
    background: ${token.colorFillSecondary} center / cover no-repeat;
    cursor: zoom-in;
    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: -2px;
    }
    &:disabled {
      cursor: default;
    }
    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
}));

interface AlbumTileProps {
  attachment: Attachment;
  messageId: string;
  available: boolean;
  album: Album;
  tile: Tile;
  onOpen: () => void;
}

const percent = (part: number, whole: number) => `${(part / whole) * 100}%`;

/** One photo of an album, placed by the album's layout in shares of its box. */
export function AlbumTile({
  attachment,
  messageId,
  available,
  album,
  tile,
  onOpen,
}: AlbumTileProps) {
  const { styles } = useStyles();
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
      onClick={broken ? retry : onOpen}
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
