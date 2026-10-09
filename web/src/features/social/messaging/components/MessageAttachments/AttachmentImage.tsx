import { Button, Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import type { Attachment } from '../../attachments/types';
import { useAttachmentUrl } from './useAttachmentAccess';

const useStyles = createStyles(({ css }) => ({
  image: css`
    display: block;
    max-width: 100%;
    max-height: 65dvh;
    margin: auto;
    object-fit: contain;
  `,
  placeholder: css`
    width: 100%;
  `,
}));

const PLACEHOLDER = {
  root: { width: '100%' },
  content: { width: 'min(560px, 100%)', height: 'min(360px, 50dvh)', margin: 'auto' },
};

interface AttachmentImageProps {
  attachment: Attachment;
  messageId: string;
}

/** The full-size image of an attachment, fetched when it is shown. */
export function AttachmentImage({ attachment, messageId }: AttachmentImageProps) {
  const { styles } = useStyles();
  const [failed, setFailed] = useState(false);
  const access = useAttachmentUrl(messageId, attachment.id, 'preview', true);

  if (access.isPending) {
    return (
      <div className={styles.placeholder} aria-label="Завантажуємо зображення" role="status">
        <Skeleton.Node active styles={PLACEHOLDER} />
      </div>
    );
  }

  if (access.isError || failed) {
    return (
      <div role="status">
        Не вдалося відкрити зображення.{' '}
        <Button
          onClick={() => {
            setFailed(false);
            void access.refetch();
          }}
        >
          Повторити
        </Button>
      </div>
    );
  }

  return (
    <img
      className={styles.image}
      src={access.data.url}
      alt={attachment.description || attachment.name}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
