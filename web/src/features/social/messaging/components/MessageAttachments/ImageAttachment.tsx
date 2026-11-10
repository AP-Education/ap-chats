import { TimelineEntryMedia, useTimelineMediaActions } from '@ap-education/timeline/media';
import {
  MediaAlbum,
  MediaAlbumTile,
  MediaBadge,
  MediaFrame,
  MediaFrameOpen,
  MediaStatus,
} from '@ap-education/ui/media';
import { thumbHashStyle } from '@ap-education/ui/thumbhash';
import { type ReactNode, useMemo } from 'react';

import type { MessageAttachment } from '../../attachments/types';
import { attachmentMedia } from '../../message-media';
import { attachmentSize } from './attachment-size';
import { useAttachmentImage } from './useAttachmentAccess';

interface PhotoProps {
  attachment: MessageAttachment;
  messageId: string;
  available: boolean;
}

interface ImageAttachmentProps extends PhotoProps {
  /** The time, when the photo closes the bubble. */
  overlay?: ReactNode;
}

/** A photo as its bubble shows it: the address it opens with, its stand-in, and a retry once broken. */
function usePhoto({ attachment, messageId, available }: PhotoProps) {
  const { open } = useTimelineMediaActions();
  const media = useMemo(() => attachmentMedia(messageId, attachment), [messageId, attachment]);
  const { placeholder } = attachment;
  const standIn = useMemo(
    () => (placeholder ? thumbHashStyle(placeholder) : undefined),
    [placeholder],
  );
  const image = useAttachmentImage(media, available);

  return {
    ...image,
    media,
    standIn,
    label: `${image.broken ? 'Повторити перегляд' : 'Переглянути'} ${attachment.name}`,
    press: image.broken ? image.retry : () => open(media.key),
  };
}

/** A message's only photo, framed as wide as its bubble. */
export function ImageAttachment({ overlay, ...props }: ImageAttachmentProps) {
  const { attachment, available } = props;
  const { observe, ...photo } = usePhoto(props);

  return (
    <TimelineEntryMedia style={photo.standIn}>
      <MediaFrame
        ref={observe}
        src={photo.src}
        size={attachmentSize(attachment)}
        alt={photo.media.alt}
        mediaKey={photo.media.key}
        referrerPolicy="no-referrer"
        onImageError={photo.fail}
      >
        {!photo.src && <MediaStatus broken={photo.broken} />}
        <MediaFrameOpen
          disabled={!available}
          aria-label={photo.label}
          title={photo.media.alt}
          onClick={photo.press}
        />
        {attachment.description && (
          <MediaBadge corner="bottom-start" tone="plain">
            ALT
          </MediaBadge>
        )}
      </MediaFrame>
      {overlay}
    </TimelineEntryMedia>
  );
}

interface ImageAlbumProps {
  images: MessageAttachment[];
  messageId: string;
  available: boolean;
  /** The time, when the album closes the bubble. */
  overlay?: ReactNode;
}

/** Several photos as one album, as Telegram groups them. */
export function ImageAlbum({ images, messageId, available, overlay }: ImageAlbumProps) {
  return (
    <TimelineEntryMedia>
      <MediaAlbum sizes={images.map(attachmentSize)}>
        {images.map((image, index) => (
          <AlbumPhoto
            key={image.id}
            index={index}
            attachment={image}
            messageId={messageId}
            available={available}
          />
        ))}
      </MediaAlbum>
      {overlay}
    </TimelineEntryMedia>
  );
}

function AlbumPhoto({ index, ...props }: PhotoProps & { index: number }) {
  const { observe, ...photo } = usePhoto(props);

  return (
    <MediaAlbumTile
      ref={observe}
      index={index}
      src={photo.src}
      alt={photo.media.alt}
      mediaKey={photo.media.key}
      referrerPolicy="no-referrer"
      onImageError={photo.fail}
      style={photo.standIn}
      disabled={!props.available}
      aria-label={photo.label}
      title={photo.media.alt}
      onClick={photo.press}
    >
      <MediaStatus broken={photo.broken} />
    </MediaAlbumTile>
  );
}
