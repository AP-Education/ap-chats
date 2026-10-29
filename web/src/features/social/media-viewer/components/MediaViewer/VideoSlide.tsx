import { LoadingIcon } from '@ap-education/ui';
import { ArrowClockwiseIcon, DownloadSimpleIcon, PlayIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import type { Attachment } from '@/features/social/messaging/attachments/types';
import {
  useAttachmentDownload,
  useAttachmentUrl,
} from '@/features/social/messaging/components/MessageAttachments/useAttachmentAccess';

import styles from './VideoSlide.module.css';

interface VideoSlideProps {
  messageId: string;
  attachment: Attachment;
  /** Only the visible slide fetches the original and plays it. */
  active: boolean;
}

export function VideoSlide({ messageId, attachment, active }: VideoSlideProps) {
  const access = useAttachmentUrl(messageId, attachment.id, 'preview', active);
  const poster = useAttachmentUrl(
    messageId,
    attachment.id,
    'thumbnail',
    active && Boolean(attachment.hasThumbnail),
  );
  const download = useAttachmentDownload(messageId, attachment);
  const videoRef = useRef<HTMLVideoElement>(null);
  const url = access.data?.url;
  const [failedUrl, setFailedUrl] = useState<string>();
  const [blockedUrl, setBlockedUrl] = useState<string>();
  const [readyUrl, setReadyUrl] = useState<string>();
  const [waiting, setWaiting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const failed = access.isError || Boolean(url && failedUrl === url);
  const blocked = Boolean(url && blockedUrl === url);
  const loading = !failed && !blocked && (!url || readyUrl !== url || waiting);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url || !active) return;
    let current = true;
    void video.play().catch(() => {
      if (current && !video.error) setBlockedUrl(url);
    });
    return () => {
      current = false;
      video.pause();
    };
  }, [active, url, attempt]);

  async function retry() {
    setRetrying(true);
    try {
      const result = await access.refetch();
      if (result.isError) return;
      setFailedUrl(undefined);
      setBlockedUrl(undefined);
      setReadyUrl(undefined);
      setWaiting(false);
      setAttempt((value) => value + 1);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className={styles.player} aria-busy={loading}>
      {failed || !url ? (
        poster.data && <img className={styles.poster} src={poster.data.url} alt="" />
      ) : (
        <video
          key={attempt}
          ref={videoRef}
          className={styles.video}
          src={url}
          poster={poster.data?.url}
          controls
          playsInline
          preload={active ? 'metadata' : 'none'}
          aria-label={attachment.name}
          onKeyDownCapture={(event) => {
            if (event.key !== ' ') return;
            event.preventDefault();
            event.stopPropagation();
            if (event.repeat) return;
            const video = event.currentTarget;
            if (video.paused) void video.play().catch(() => setBlockedUrl(url));
            else video.pause();
          }}
          onKeyUpCapture={(event) => {
            if (event.key !== ' ') return;
            event.preventDefault();
            event.stopPropagation();
          }}
          onLoadedData={() => setReadyUrl(url)}
          onWaiting={() => setWaiting(true)}
          onCanPlay={() => setWaiting(false)}
          onPause={() => setWaiting(false)}
          onPlaying={() => {
            setReadyUrl(url);
            setBlockedUrl(undefined);
            setWaiting(false);
          }}
          onError={() => setFailedUrl(url)}
        />
      )}
      {loading && (
        <div className={styles.loading} role="status" aria-label="Завантажуємо відео">
          <LoadingIcon size={28} />
          <span>Завантажуємо відео…</span>
        </div>
      )}
      {blocked && !failed && (
        <button
          type="button"
          className={styles.resume}
          aria-label="Відтворити відео"
          onClick={() => void videoRef.current?.play().catch(() => undefined)}
        >
          <PlayIcon size={32} weight="fill" />
        </button>
      )}
      {failed && (
        <div className={styles.failure} role="status">
          <p>Не вдалося відтворити відео</p>
          <div className={styles.actions}>
            <button type="button" disabled={retrying} onClick={() => void retry()}>
              {retrying ? <LoadingIcon size={19} /> : <ArrowClockwiseIcon size={19} />}
              Спробувати ще
            </button>
            <button
              type="button"
              disabled={download.downloading}
              onClick={() => void download.download()}
            >
              {download.downloading ? <LoadingIcon size={19} /> : <DownloadSimpleIcon size={19} />}
              Завантажити відео
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
