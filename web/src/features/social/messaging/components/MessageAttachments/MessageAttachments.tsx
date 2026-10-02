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
    &[data-single] {
      grid-template-columns: minmax(0, 1fr);
    }
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
      {images.length > 0 && (
        <div className={styles.mosaic} data-single={images.length === 1 || undefined}>
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

function ImageAttachment({
  attachment,
  messageId,
  available,
  onOpen,
}: {
  attachment: Attachment;
  messageId: string;
  available: boolean;
  onOpen: () => void;
}) {
  const { styles } = useStyles();
  const { observeElement, visible } = useVisibleAttachment();
  const access = useAttachmentUrl(messageId, attachment.id, 'thumbnail', available && visible);
  const [failed, setFailed] = useState(false);
  const broken = failed || access.isError;
  return (
    <button
      ref={observeElement}
      type="button"
      className={styles.tile}
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
