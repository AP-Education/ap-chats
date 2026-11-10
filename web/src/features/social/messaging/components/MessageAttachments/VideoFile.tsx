import {
  TimelineEntryFile,
  TimelineEntryMedia,
  useTimelineMediaActions,
} from '@ap-education/timeline/media';
import { LoadingIcon } from '@ap-education/ui';
import { FileCardAction, FileCardActions, FileCardBadge, MediaFrame } from '@ap-education/ui/media';
import { thumbHashStyle } from '@ap-education/ui/thumbhash';
import { DownloadSimpleIcon, PlayIcon } from '@phosphor-icons/react';

import { formatFileSize } from '../../attachments/file-presentation';
import { attachmentMedia, mediaKey } from '../../message-media';
import { attachmentSize } from './attachment-size';
import type { FileAttachmentProps } from './FileAttachment';
import { useAttachmentDownload, useAttachmentImage } from './useAttachmentAccess';
import { videoDuration } from './video-duration';
import styles from './VideoFile.module.css';

// A video plays in the viewer, among the conversation's other media.
export function VideoFile(props: FileAttachmentProps) {
  if (props.attachment.hasThumbnail) return <VideoPoster {...props} />;

  return <VideoFileCard {...props} />;
}

function VideoFileCard({ attachment, messageId, available }: FileAttachmentProps) {
  const { open } = useTimelineMediaActions();
  const download = useAttachmentDownload(messageId, attachment);
  const save = () => void download.download();

  return (
    <TimelineEntryFile
      name={attachment.name}
      size={attachment.size}
      onNameClick={save}
      nameDisabled={!available}
    >
      <FileCardBadge
        label={`Відтворити ${attachment.name}`}
        disabled={!available}
        onClick={() => open(mediaKey(messageId, attachment.id))}
      >
        <PlayIcon size={22} weight="fill" />
      </FileCardBadge>
      <FileCardActions>
        <FileCardAction
          label={`Завантажити ${attachment.name}`}
          disabled={!available}
          busy={download.downloading}
          onClick={save}
        >
          <DownloadSimpleIcon size={20} />
        </FileCardAction>
      </FileCardActions>
    </TimelineEntryFile>
  );
}

function VideoPoster({ attachment, messageId, available, overlay }: FileAttachmentProps) {
  const { open } = useTimelineMediaActions();
  const download = useAttachmentDownload(messageId, attachment);
  const media = attachmentMedia(messageId, attachment);
  const { observe, src, fail, broken } = useAttachmentImage(media, available);
  const duration = videoDuration(attachment.duration);
  const standIn = attachment.placeholder ? thumbHashStyle(attachment.placeholder) : undefined;

  return (
    <TimelineEntryMedia style={standIn}>
      <MediaFrame
        ref={observe}
        className={styles.video}
        src={src}
        size={attachmentSize(attachment)}
        alt={`Кадр відео ${attachment.name}`}
        mediaKey={media.key}
        onImageError={fail}
        referrerPolicy="no-referrer"
      >
        <button
          type="button"
          className={styles.play}
          disabled={!available}
          aria-label={`Відкрити відео ${attachment.name}`}
          title={attachment.name}
          onClick={(event) => {
            event.currentTarget.focus({ preventScroll: true });
            open(media.key);
          }}
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
    </TimelineEntryMedia>
  );
}
