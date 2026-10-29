import { LoadingIcon } from '@ap-education/ui';
import { DownloadSimpleIcon, PlayIcon } from '@phosphor-icons/react';

import { fileSummary, formatFileSize } from '../../attachments/file-presentation';
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
export function VideoFile(props: FileAttachmentProps) {
  if (props.attachment.hasThumbnail) return <VideoPoster {...props} />;
  return <VideoFileCard {...props} />;
}

function VideoFileCard({ attachment, messageId, available }: FileAttachmentProps) {
  const viewer = useMediaViewer();
  const download = useAttachmentDownload(messageId, attachment);
  const save = () => void download.download();
  const play = () => viewer.open(mediaKey(messageId, attachment.id));

  return (
    <FileCard
      name={attachment.name}
      meta={fileSummary(attachment.name, attachment.size)}
      onNamePress={save}
      nameDisabled={!available}
      badge={
        <FileBadge label={`Відтворити ${attachment.name}`} disabled={!available} onPress={play}>
          <PlayIcon size={22} weight="fill" />
        </FileBadge>
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
}

function VideoPoster({ attachment, messageId, available, overlay }: FileAttachmentProps) {
  const viewer = useMediaViewer();
  const download = useAttachmentDownload(messageId, attachment);
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
      className={styles.video}
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
        title={attachment.name}
        onClick={() => viewer.open(key)}
      >
        <span className={styles.playIcon} aria-hidden>
          <PlayIcon size={32} weight="fill" />
        </span>
      </button>
      <span className={styles.info}>
        {duration && <span aria-label={`Тривалість ${duration}`}>{duration}</span>}
        {duration && <span aria-hidden>·</span>}
        <span>{formatFileSize(attachment.size)}</span>
      </span>
      <button
        type="button"
        className={styles.download}
        disabled={!available || download.downloading}
        aria-label={`Завантажити ${attachment.name}`}
        aria-busy={download.downloading}
        title={`Завантажити ${attachment.name}`}
        onClick={() => void download.download()}
      >
        <span className={styles.downloadIcon} aria-hidden>
          {download.downloading ? <LoadingIcon size={19} /> : <DownloadSimpleIcon size={19} />}
        </span>
      </button>
      {broken && (
        <span className={styles.unavailable} role="status">
          Превʼю недоступне
        </span>
      )}
      {overlay}
    </MediaFrame>
  );
}
