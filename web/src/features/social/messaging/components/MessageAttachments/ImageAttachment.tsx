import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';

import { mediaKey } from '@/features/social/media-viewer/media-list';
import { useMediaViewer } from '@/features/social/media-viewer/stores/media-viewer-context';

import type { Attachment } from '../../attachments/types';
import { MediaFrame } from '../MediaFrame/MediaFrame';
import { attachmentSize } from './attachment-size';
import { ImageStatus } from './ImageStatus';
import { useAttachmentImage } from './useAttachmentAccess';

const useStyles = createStyles(({ token, css }) => ({
  // The whole frame opens the photo; the time and badges over it stay outside the button.
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
    &:disabled {
      cursor: default;
    }
  `,
  alt: css`
    position: absolute;
    bottom: 6px;
    left: 6px;
    padding: 2px ${token.paddingXXS}px;
    border-radius: ${token.borderRadiusXS}px;
    background: ${token.colorBgContainer};
    color: ${token.colorText};
    font-size: 10px;
    font-weight: 600;
    pointer-events: none;
  `,
}));

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
  const { styles } = useStyles();
  const viewer = useMediaViewer();
  const key = mediaKey(messageId, attachment.id);
  const { observeElement, src, broken, markBroken, retry } = useAttachmentImage(
    messageId,
    attachment.id,
    available,
  );
  const label = attachment.description || attachment.name;

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
        aria-label={`${broken ? 'Повторити перегляд' : 'Переглянути'} ${attachment.name}`}
        title={label}
        onClick={broken ? retry : () => viewer.open(key)}
      />
      {attachment.description && <span className={styles.alt}>ALT</span>}
      {overlay}
    </MediaFrame>
  );
}
