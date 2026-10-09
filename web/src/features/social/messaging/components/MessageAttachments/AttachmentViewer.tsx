import { ArrowLeftIcon, ArrowRightIcon, DownloadSimpleIcon } from '@phosphor-icons/react';
import { Button, Modal } from 'antd';
import { createStyles } from 'antd-style';

import { formatFileSize } from '../../attachments/file-presentation';
import type { Attachment } from '../../attachments/types';
import { AttachmentImage } from './AttachmentImage';
import { useAttachmentDownload } from './useAttachmentAccess';

const useStyles = createStyles(({ token, css }) => ({
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
        <AttachmentImage key={attachment.id} attachment={attachment} messageId={messageId} />
      </div>
      {attachment.description && <p>{attachment.description}</p>}
    </Modal>
  );
}
