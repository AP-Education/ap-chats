import {
  DownloadSimpleIcon,
  FileIcon,
  MusicNotesIcon,
  PlayIcon,
  VideoCameraIcon,
} from '@phosphor-icons/react';
import { Button, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { fileExtension, formatFileSize } from '../../attachments/file-presentation';
import type { Attachment } from '../../attachments/types';
import { useAttachmentDownload, useAttachmentUrl } from './useAttachmentAccess';

const useStyles = createStyles(({ token, css }) => ({
  shell: css`
    width: min(420px, 100%);
    overflow: hidden;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
  `,
  card: css`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    padding: 10px 12px;
    @media (max-width: ${token.screenMD}px) {
      gap: 8px;
      padding: 8px;
    }
  `,
  icon: css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 40px;
    height: 44px;
    border-radius: ${token.borderRadius}px;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
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
    color: ${token.colorText};
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
    font: inherit;
    font-size: ${token.fontSizeSM}px;
    font-weight: 550;
    cursor: pointer;
    &:hover {
      color: ${token.colorPrimary};
    }
  `,
  meta: css`
    margin-top: 3px;
    color: ${token.colorTextSecondary};
    font-size: 12px;
  `,
  actions: css`
    display: flex;
    flex-shrink: 0;
    gap: 2px;
  `,
  player: css`
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
    padding: 8px 12px;
    color: ${token.colorTextSecondary};
    font-size: 12px;
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
  let icon = <FileIcon size={24} weight="duotone" aria-hidden />;
  if (attachment.preview === 'video')
    icon = <VideoCameraIcon size={24} weight="duotone" aria-hidden />;
  if (attachment.preview === 'audio')
    icon = <MusicNotesIcon size={24} weight="duotone" aria-hidden />;
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
            <Button
              type="text"
              style={{ width: 40, height: 40 }}
              icon={<PlayIcon size={20} />}
              aria-label={`Відтворити ${attachment.name}`}
              disabled={!available}
              onClick={() => setPlaying(true)}
            />
          )}
          <Button
            type="text"
            style={{ width: 40, height: 40 }}
            icon={<DownloadSimpleIcon size={20} />}
            aria-label={`Завантажити ${attachment.name}`}
            disabled={!available}
            loading={download.downloading}
            onClick={() => void download.download()}
          />
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
          <Button
            type="link"
            size="small"
            onClick={() => {
              setMediaFailed(false);
              void access.refetch();
            }}
          >
            Повторити
          </Button>
        </div>
      )}
    </article>
  );
}
