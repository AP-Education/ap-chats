import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import type { Attachment } from '../../attachments/types';
import { useAttachmentUrl } from './useAttachmentAccess';

const useStyles = createStyles(({ token, css }) => ({
  player: css`
    margin-top: 6px;
    overflow: hidden;
    border-radius: ${token.borderRadiusLG}px;
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

const AUDIO_PLACEHOLDER = {
  root: { width: '100%' },
  content: { width: '100%', height: 40 },
};

interface AttachmentPlayerProps {
  attachment: Attachment;
  messageId: string;
}

/** Plays an audio attachment inline, fetching its address once asked to play. */
export function AttachmentPlayer({ attachment, messageId }: AttachmentPlayerProps) {
  const { styles } = useStyles();
  const [mediaFailed, setMediaFailed] = useState(false);
  const access = useAttachmentUrl(messageId, attachment.id, 'preview', true);

  if (access.isPending) {
    return (
      <div className={styles.player} aria-label="Завантажуємо відтворення" role="status">
        <Skeleton.Node active styles={AUDIO_PLACEHOLDER} />
      </div>
    );
  }

  if (access.isError || mediaFailed) {
    return (
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
    );
  }

  return (
    <div className={styles.player}>
      <audio
        src={access.data.url}
        controls
        preload="none"
        aria-label={attachment.name}
        onError={() => setMediaFailed(true)}
      />
    </div>
  );
}
