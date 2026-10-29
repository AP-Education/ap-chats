import { LoadingIcon } from '@ap-education/ui';
import { createStyles } from 'antd-style';
import { useEffect, useRef, useState } from 'react';

import type { Attachment } from '@/features/social/messaging/attachments/types';
import {
  useAttachmentDownload,
  useAttachmentUrl,
} from '@/features/social/messaging/components/MessageAttachments/useAttachmentAccess';

const useStyles = createStyles(({ css }) => ({
  video: css`
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #000;
  `,
  status: css`
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    background: #000;
    color: rgba(255, 255, 255, 0.72);
  `,
}));

interface VideoSlideProps {
  messageId: string;
  attachment: Attachment;
  /** Plays while it is the slide on screen, and pauses once swiped away. */
  active: boolean;
}

export function VideoSlide({ messageId, attachment, active }: VideoSlideProps) {
  const { styles } = useStyles();
  const access = useAttachmentUrl(messageId, attachment.id, 'preview', true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const url = access.data?.url;
  const [failedUrl, setFailedUrl] = useState<string>();
  const download = useAttachmentDownload(messageId, attachment);
  const failed = Boolean(url && failedUrl === url);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // The browser may refuse to start with sound; the controls are there to start it by hand.
    if (active) void video.play().catch(() => undefined);
    else video.pause();
  }, [active, url]);

  if (access.isError || failed) {
    return (
      <div className={styles.status} role="status">
        <div>
          <p>Не вдалося відтворити відео</p>
          <button
            type="button"
            disabled={download.downloading}
            onClick={() => void download.download()}
          >
            Завантажити відео
          </button>
        </div>
      </div>
    );
  }

  if (!url) {
    return (
      <div className={styles.status} role="status" aria-label="Завантажуємо відео">
        <LoadingIcon size={32} />
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className={styles.video}
      src={url}
      controls
      playsInline
      preload="metadata"
      aria-label={attachment.name}
      onError={() => setFailedUrl(url)}
    />
  );
}
