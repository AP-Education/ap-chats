import type { ReactNode } from 'react';

import type { Attachment } from '../../attachments/types';
import { AttachmentAlbum } from './AttachmentAlbum';
import { FileAttachment } from './FileAttachment';
import { ImageAttachment } from './ImageAttachment';

export function MessageAttachments({
  attachments,
  messageId,
  available = true,
  overlay,
}: {
  attachments: Attachment[];
  messageId: string;
  available?: boolean;
  /** The time, when media closes the bubble. */
  overlay?: ReactNode;
}) {
  const images = attachments.filter((file) => file.preview === 'image');
  const files = attachments.filter((file) => file.preview !== 'image');
  if (!attachments.length) return null;
  return (
    <>
      {images.length === 1 && (
        <ImageAttachment
          attachment={images[0]!}
          messageId={messageId}
          available={available}
          overlay={!files.length && overlay}
        />
      )}
      {images.length > 1 && (
        <AttachmentAlbum
          images={images}
          messageId={messageId}
          available={available}
          overlay={!files.length && overlay}
        />
      )}
      {files.map((file, index) => (
        <FileAttachment
          key={file.id}
          attachment={file}
          messageId={messageId}
          available={available}
          overlay={index === files.length - 1 && overlay}
        />
      ))}
    </>
  );
}
