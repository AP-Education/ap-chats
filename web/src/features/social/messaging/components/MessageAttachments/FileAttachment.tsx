import { IconButton, LoadingIcon } from '@ap-education/ui';
import {
  DownloadSimpleIcon,
  FileIcon,
  MusicNotesIcon,
  PlayIcon,
  VideoCameraIcon,
} from '@phosphor-icons/react';
import { Spin } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { fileExtension, formatFileSize } from '../../attachments/file-presentation';
import type { Attachment } from '../../attachments/types';
import { useAttachmentDownload, useAttachmentUrl } from './useAttachmentAccess';

const useStyles = createStyles(({ token, css }) => ({
  shell: css`
    min-width: min(240px, 100%);
    max-width: 420px;
  `,
  card: css`
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 2px 0;
  `,
  icon: css`
    display: grid;
    place-items: center;
    flex: 0 0 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--bubble-accent);
    color: var(--bubble-on-accent, #fff);
  `,
  details: css`
    flex: 1;
    min-width: 0;
  `,
  name: css`
    display: block;
    width: 100%;
    padding: 0;
    overflow: hidden;
    border: 0;
    background: transparent;
    color: var(--bubble-text);
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
    font: inherit;
    font-size: ${token.fontSizeSM}px;
    font-weight: 550;
    cursor: pointer;
    &:hover:not(:disabled) {
      text-decoration: underline;
    }
  `,
  meta: css`
    margin-top: 2px;
    color: var(--bubble-meta);
    font-size: 12px;
  `,
  actions: css`
    display: flex;
    flex-shrink: 0;
    gap: 2px;
  `,
  action: css`
    color: var(--bubble-muted);

    &:hover:not(:disabled) {
      background: var(--bubble-fill);
      color: var(--bubble-text);
    }
  `,
  player: css`
    margin-top: 6px;
    overflow: hidden;
    border-radius: ${token.borderRadiusLG}px;
    video {
      display: block;
      width: 100%;
      max-height: 360px;
      background: #000;
    }
    audio {
      display: block;
      width: 100%;
    }
  `,
  error: css`
    padding: 6px 0 0;
    color: var(--bubble-muted);
    font-size: 12px;
  `,
  retry: css`
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--bubble-link);
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  `,
}));

export function FileAttachment({
  attachment,
  messageId,
  available,
}: {
  attachment: Attachment;
  messageId: string;
  available: boolean;
}) {
  const { styles } = useStyles();
  const [playing, setPlaying] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const access = useAttachmentUrl(messageId, attachment.id, 'preview', playing && available);
  const download = useAttachmentDownload(messageId, attachment);
  const playable = attachment.preview === 'video' || attachment.preview === 'audio';
  let icon = <FileIcon size={22} weight="fill" aria-hidden />;
  if (attachment.preview === 'video')
    icon = <VideoCameraIcon size={22} weight="fill" aria-hidden />;
  if (attachment.preview === 'audio') icon = <MusicNotesIcon size={22} weight="fill" aria-hidden />;
  const failed = mediaFailed || access.isError;

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
            {fileExtension(attachment.name)} · {formatFileSize(attachment.size)}
          </div>
        </div>
        <div className={styles.actions}>
          {playable && !playing && (
            <IconButton
              size={36}
              className={styles.action}
              aria-label={`Відтворити ${attachment.name}`}
              disabled={!available}
              onClick={() => setPlaying(true)}
            >
              <PlayIcon size={20} />
            </IconButton>
          )}
          <IconButton
            size={36}
            className={styles.action}
            aria-label={`Завантажити ${attachment.name}`}
            disabled={!available || download.downloading}
            onClick={() => void download.download()}
          >
            {download.downloading ? <LoadingIcon size={20} /> : <DownloadSimpleIcon size={20} />}
          </IconButton>
        </div>
      </div>
      {playing && access.isPending && <Spin size="small" />}
      {playing && access.data && !failed && (
        <div className={styles.player}>
          {attachment.preview === 'video' ? (
            <video
              src={access.data.url}
              controls
              playsInline
              preload="none"
              aria-label={attachment.name}
              onError={() => setMediaFailed(true)}
            />
          ) : (
            <audio
              src={access.data.url}
              controls
              preload="none"
              aria-label={attachment.name}
              onError={() => setMediaFailed(true)}
            />
          )}
        </div>
      )}
      {playing && failed && (
        <div className={styles.error} role="status">
          Перегляд недоступний. Файл можна завантажити.{' '}
          <button
            type="button"
            className={styles.retry}
            onClick={() => {
              setMediaFailed(false);
              void access.refetch();
            }}
          >
            Повторити
          </button>
        </div>
      )}
    </article>
  );
}
