import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { Attachment } from '../../attachments/types';
import { mediaKey, useMediaViewer } from '../../media-viewer-context';
import { MediaFrame } from '../MediaFrame/MediaFrame';
import { attachmentSize } from './attachment-size';
import styles from './ImageAttachment.module.css';
import { ImageStatus } from './ImageStatus';
import { useAttachmentImage } from './useAttachmentAccess';

interface ImageAttachmentProps {
  attachment: Attachment;
  messageId: string;
  available: boolean;
  /** The time, when the photo closes the bubble. */
  overlay?: ReactNode;
}

/** A message's only photo, framed as wide as its bubble. */
export function ImageAttachment({
  attachment,
  messageId,
  available,
  overlay,
}: ImageAttachmentProps) {
  const { t } = useTranslation('messaging');
  const viewer = useMediaViewer();
  const key = mediaKey(messageId, attachment.id);
  const { observeElement, src, broken, markBroken, retry } = useAttachmentImage(
    messageId,
    attachment.id,
    available,
  );
  const label = attachment.description || attachment.name;
  const viewLabel = broken
    ? t(($) => $.attachments.retryView, { name: attachment.name })
    : t(($) => $.attachments.view, { name: attachment.name });

  return (
    <MediaFrame
      ref={observeElement}
      src={src}
      size={attachmentSize(attachment)}
      alt={label}
      placeholder={attachment.placeholder}
      referrerPolicy="no-referrer"
      onImageError={markBroken}
      data-attachment-media
      data-media-key={key}
    >
      {!src && <ImageStatus broken={broken} />}
      <button
        type="button"
        className={styles.open}
        disabled={!available}
        aria-label={viewLabel}
        title={label}
        onClick={broken ? retry : () => viewer.open(key)}
      />
      {attachment.description && <span className={styles.alt}>ALT</span>}
      {overlay}
    </MediaFrame>
  );
}
