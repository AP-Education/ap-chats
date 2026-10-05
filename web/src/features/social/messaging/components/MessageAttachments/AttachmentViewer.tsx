import { ArrowLeftIcon, ArrowRightIcon, DownloadSimpleIcon } from '@phosphor-icons/react';
import { Button, Modal, Spin } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { formatFileSize } from '../../attachments/file-presentation';
import type { Attachment } from '../../attachments/types';
import { useAttachmentDownload, useAttachmentUrl } from './useAttachmentAccess';

const useStyles = createStyles(({ token, css }) => ({
  image: css`
    display: block;
    max-width: 100%;
    max-height: 65dvh;
    margin: auto;
    object-fit: contain;
  `,
  body: css`
    display: grid;
    place-items: center;
    min-height: 200px;
  `,
  footer: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  `,
  meta: css`
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
  `,
  navigation: css`
    display: flex;
    align-items: center;
    gap: 4px;
  `,
}));

export function AttachmentViewer({
  attachment,
  messageId,
  position,
  total,
  onPrevious,
  onNext,
  onClose,
}: {
  attachment: Attachment;
  messageId: string;
  position: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const { styles } = useStyles();
  const [failed, setFailed] = useState(false);
  const access = useAttachmentUrl(messageId, attachment.id, 'preview', true);
  const download = useAttachmentDownload(messageId, attachment);
  return (
    <Modal
      open
      title={attachment.name}
      onCancel={onClose}
      width={960}
      centered
      destroyOnHidden
      footer={
        <div className={styles.footer}>
          <span className={styles.meta}>{formatFileSize(attachment.size)}</span>
          {total > 1 && (
            <div className={styles.navigation}>
              <Button
                type="text"
                icon={<ArrowLeftIcon size={20} />}
                aria-label="Попереднє зображення"
                disabled={position === 0}
                onClick={onPrevious}
              />
              <span>
                {position + 1} / {total}
              </span>
              <Button
                type="text"
                icon={<ArrowRightIcon size={20} />}
                aria-label="Наступне зображення"
                disabled={position === total - 1}
                onClick={onNext}
              />
            </div>
          )}
          <Button
            icon={<DownloadSimpleIcon size={18} />}
            loading={download.downloading}
            onClick={() => void download.download()}
          >
            Завантажити
          </Button>
        </div>
      }
    >
      <div className={styles.body}>
        {access.isPending && <Spin />}
        {(access.isError || failed) && (
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
        )}
        {access.data && !failed && (
          <img
            className={styles.image}
            src={access.data.url}
            alt={attachment.description || attachment.name}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      {attachment.description && <p>{attachment.description}</p>}
    </Modal>
  );
}
