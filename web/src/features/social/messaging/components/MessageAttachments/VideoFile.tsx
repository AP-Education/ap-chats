import { PlayIcon } from '@phosphor-icons/react';

import { fileSummary } from '../../attachments/file-presentation';
import { mediaKey, useMediaViewer } from '../../media-viewer-context';
import { MediaFrame } from '../MediaFrame/MediaFrame';
import { attachmentSize } from './attachment-size';
import type { FileAttachmentProps } from './FileAttachment';
import { FileBadge } from './FileBadge';
import { FileCard } from './FileCard';
import { FileDownloadButton } from './FileDownloadButton';
import { useAttachmentDownload, useAttachmentImage } from './useAttachmentAccess';
import { videoDuration } from './video-duration';
import styles from './VideoFile.module.css';

// A video plays in the viewer, among the conversation's other media.
export function VideoFile({ attachment, messageId, available }: FileAttachmentProps) {
  const viewer = useMediaViewer();
  const download = useAttachmentDownload(messageId, attachment);
  const save = () => void download.download();
  const play = () => viewer.open(mediaKey(messageId, attachment.id));

  const card = (
    <FileCard
      name={attachment.name}
      meta={fileSummary(attachment.name, attachment.size)}
      onNamePress={save}
      nameDisabled={!available}
      badge={
        !attachment.hasThumbnail && (
          <FileBadge label={`Відтворити ${attachment.name}`} disabled={!available} onPress={play}>
            <PlayIcon size={22} weight="fill" />
          </FileBadge>
        )
      }
      trailing={
        <FileDownloadButton
          name={attachment.name}
          downloading={download.downloading}
          disabled={!available}
          onPress={save}
        />
      }
    />
  );

  if (!attachment.hasThumbnail) return card;

  return (
    <div className={styles.video} data-attachment-media>
      <VideoPoster attachment={attachment} messageId={messageId} available={available} />
      {card}
    </div>
  );
}

function VideoPoster({ attachment, messageId, available }: FileAttachmentProps) {
  const viewer = useMediaViewer();
  const key = mediaKey(messageId, attachment.id);
  const { observeElement, src, broken, markBroken } = useAttachmentImage(
    messageId,
    attachment.id,
    available,
  );
  const duration = videoDuration(attachment.duration);

  return (
    <MediaFrame
      ref={observeElement}
      src={src}
      size={attachmentSize(attachment)}
      alt={`Кадр відео ${attachment.name}`}
      placeholder={attachment.placeholder}
      onImageError={markBroken}
      referrerPolicy="no-referrer"
      data-attachment-media
      data-media-key={key}
    >
      <button
        type="button"
        className={styles.play}
        disabled={!available}
        aria-label={`Відкрити відео ${attachment.name}`}
        onClick={() => viewer.open(key)}
      >
        <span className={styles.playIcon}>
          <PlayIcon size={32} weight="fill" />
        </span>
      </button>
      {duration && (
        <span className={styles.duration} aria-label={`Тривалість ${duration}`}>
          {duration}
        </span>
      )}
      {broken && (
        <span className={styles.unavailable} role="status">
          Превʼю недоступне
        </span>
      )}
    </MediaFrame>
  );
}
