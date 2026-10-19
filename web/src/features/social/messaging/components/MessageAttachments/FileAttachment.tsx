import { useShellLocale } from '@ap-education/shell-sdk';
import { IconButton, LoadingIcon } from '@ap-education/ui';
import {
  DownloadSimpleIcon,
  FileIcon,
  MusicNotesIcon,
  PlayIcon,
  VideoCameraIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { fileExtension, formatFileSize } from '../../attachments/file-presentation';
import type { Attachment } from '../../attachments/types';
import { mediaKey, useMediaViewer } from '../../media-viewer-context';
import { AttachmentPlayer } from './AttachmentPlayer';
import styles from './FileAttachment.module.css';
import { useAttachmentDownload } from './useAttachmentAccess';

export function FileAttachment({
  attachment,
  messageId,
  available,
}: {
  attachment: Attachment;
  messageId: string;
  available: boolean;
}) {
  const { t } = useTranslation('messaging');
  const locale = useShellLocale();
  const viewer = useMediaViewer();
  const [playing, setPlaying] = useState(false);
  const download = useAttachmentDownload(messageId, attachment);
  const video = attachment.preview === 'video';
  const playable = video || attachment.preview === 'audio';
  // A video plays in the viewer, among the conversation's other media; audio plays in place.
  const play = video
    ? () => viewer.open(mediaKey(messageId, attachment.id))
    : () => setPlaying(true);
  let icon = <FileIcon size={22} weight="fill" aria-hidden />;
  if (video) icon = <VideoCameraIcon size={22} weight="fill" aria-hidden />;
  if (attachment.preview === 'audio') icon = <MusicNotesIcon size={22} weight="fill" aria-hidden />;

  return (
    <article className={styles.shell} aria-label={attachment.name}>
      <div className={styles.card}>
        <div className={styles.icon}>{icon}</div>
        <div className={styles.details}>
          <button
            type="button"
            className={styles.name}
            disabled={!available}
            onClick={() => void download.download()}
            title={attachment.name}
          >
            {attachment.name}
          </button>
          <div className={styles.meta}>
            {fileExtension(attachment.name, t)} · {formatFileSize(attachment.size, locale)}
          </div>
        </div>
        <div className={styles.actions}>
          {playable && !playing && (
            <IconButton
              size={36}
              className={styles.action}
              aria-label={t(($) => $.attachments.play, { name: attachment.name })}
              disabled={!available}
              onClick={play}
            >
              <PlayIcon size={20} />
            </IconButton>
          )}
          <IconButton
            size={36}
            className={styles.action}
            aria-label={t(($) => $.attachments.download, { name: attachment.name })}
            disabled={!available || download.downloading}
            onClick={() => void download.download()}
          >
            {download.downloading ? <LoadingIcon size={20} /> : <DownloadSimpleIcon size={20} />}
          </IconButton>
        </div>
      </div>
      {playing && available && <AttachmentPlayer attachment={attachment} messageId={messageId} />}
    </article>
  );
}
