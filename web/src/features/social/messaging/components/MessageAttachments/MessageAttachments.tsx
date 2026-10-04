import { ArrowClockwiseIcon, ImageIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import type { Attachment } from '../../attachments/types';
import { AttachmentViewer } from './AttachmentViewer';
import { FileAttachment } from './FileAttachment';
import { useAttachmentUrl, useVisibleAttachment } from './useAttachmentAccess';

const useStyles = createStyles(({ token, css }) => ({
  stack: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 6px;
    min-width: 0;
  `,
  mosaic: css`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
    width: min(420px, 100%);
    overflow: hidden;
    border-radius: ${token.borderRadiusLG}px;
  `,
  tile: css`
    position: relative;
    display: grid;
    place-items: center;
    aspect-ratio: 4 / 3;
    min-width: 0;
    padding: 0;
    overflow: hidden;
    border: 0;
    background: ${token.colorFillSecondary};
    color: ${token.colorTextSecondary};
    cursor: zoom-in;
    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: -3px;
    }
    &:disabled {
      cursor: default;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
  // A lone image keeps its own proportions (bounded, never cropped) —
  // the fixed cover-cropped tile only makes sense once images must tile
  // together, same split Discord/Telegram draw between one image and a grid.
  single: css`
    position: relative;
    display: grid;
    place-items: center;
    max-width: min(420px, 100%);
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorFillSecondary};
    color: ${token.colorTextSecondary};
    cursor: zoom-in;
    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: -3px;
    }
    &:disabled {
      cursor: default;
    }
    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  `,
  alt: css`
    position: absolute;
    bottom: 6px;
    left: 6px;
    padding: 2px 5px;
    border-radius: 4px;
    background: ${token.colorBgContainer};
    color: ${token.colorText};
    font-size: 10px;
    font-weight: 600;
  `,
}));

export function MessageAttachments({
  attachments,
  messageId,
  available = true,
}: {
  attachments: Attachment[];
  messageId: string;
  available?: boolean;
}) {
  const { styles } = useStyles();
  const [selected, setSelected] = useState<number | null>(null);
  const images = attachments.filter((file) => file.preview === 'image');
  const files = attachments.filter((file) => file.preview !== 'image');
  const current = selected === null ? undefined : images[selected];
  if (!attachments.length) return null;
  return (
    <div className={styles.stack}>
      {images.length === 1 && (
        <ImageAttachment
          attachment={images[0]!}
          messageId={messageId}
          available={available}
          natural
          onOpen={() => setSelected(0)}
        />
      )}
      {images.length > 1 && (
        <div className={styles.mosaic}>
          {images.map((image, index) => (
            <ImageAttachment
              key={image.id}
              attachment={image}
              messageId={messageId}
              available={available}
              onOpen={() => setSelected(index)}
            />
          ))}
        </div>
      )}
      {files.map((file) => (
        <FileAttachment
          key={file.id}
          attachment={file}
          messageId={messageId}
          available={available}
        />
      ))}
      {current && (
        <AttachmentViewer
          key={current.id}
          attachment={current}
          messageId={messageId}
          position={selected!}
          total={images.length}
          onPrevious={() => setSelected((index) => Math.max(0, index! - 1))}
          onNext={() => setSelected((index) => Math.min(images.length - 1, index! + 1))}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

const SINGLE_MAX_WIDTH = 420;
const SINGLE_MAX_HEIGHT = 320;

function naturalBoxSize(attachment: Attachment): { width: number; height: number } | undefined {
  if (!attachment.width || !attachment.height) return undefined;
  const scale = Math.min(
    SINGLE_MAX_WIDTH / attachment.width,
    SINGLE_MAX_HEIGHT / attachment.height,
    1,
  );
  return {
    width: Math.round(attachment.width * scale),
    height: Math.round(attachment.height * scale),
  };
}

function ImageAttachment({
  attachment,
  messageId,
  available,
  natural,
  onOpen,
}: {
  attachment: Attachment;
  messageId: string;
  available: boolean;
  natural?: boolean;
  onOpen: () => void;
}) {
  const { styles } = useStyles();
  const { observeElement, visible } = useVisibleAttachment();
  const access = useAttachmentUrl(messageId, attachment.id, 'thumbnail', available && visible);
  const [failed, setFailed] = useState(false);
  const broken = failed || access.isError;
  const box = natural ? naturalBoxSize(attachment) : undefined;
  return (
    <button
      ref={observeElement}
      type="button"
      className={box ? styles.single : styles.tile}
      style={box}
      disabled={!available}
      aria-label={`${broken ? 'Повторити перегляд' : 'Переглянути'} ${attachment.name}`}
      title={attachment.description || attachment.name}
      onClick={() => {
        if (broken) {
          setFailed(false);
          void access.refetch();
        } else onOpen();
      }}
    >
      {access.data && !failed ? (
        <img
          src={access.data.url}
          loading="lazy"
          decoding="async"
          alt={attachment.description || attachment.name}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : broken ? (
        <ArrowClockwiseIcon size={28} aria-hidden />
      ) : (
        <ImageIcon size={28} aria-hidden />
      )}
      {attachment.description && <span className={styles.alt}>ALT</span>}
    </button>
  );
}
