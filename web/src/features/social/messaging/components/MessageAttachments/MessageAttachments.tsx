import { type ReactNode, useState } from 'react';

import type { Attachment } from '../../attachments/types';
import { AttachmentAlbum } from './AttachmentAlbum';
import { AttachmentViewer } from './AttachmentViewer';
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
  /** The time, when the photos close the bubble. */
  overlay?: ReactNode;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const images = attachments.filter((file) => file.preview === 'image');
  const files = attachments.filter((file) => file.preview !== 'image');
  const current = selected === null ? undefined : images[selected];
  if (!attachments.length) return null;
  return (
    <>
      {images.length === 1 && (
        <ImageAttachment
          attachment={images[0]!}
          messageId={messageId}
          available={available}
          overlay={overlay}
          onOpen={() => setSelected(0)}
        />
      )}
      {images.length > 1 && (
        <AttachmentAlbum
          images={images}
          messageId={messageId}
          available={available}
          overlay={overlay}
          onOpen={setSelected}
        />
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
    </>
  );
}
