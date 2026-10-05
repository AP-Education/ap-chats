import { FileIcon } from '@phosphor-icons/react';
import { Progress } from 'antd';
import { createStyles } from 'antd-style';

import { fileExtension, formatFileSize } from '../../attachments/file-presentation';
import type { AttachmentDraft } from '../../attachments/types';

const useStyles = createStyles(({ token, css }) => ({
  stack: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 6px;
    min-width: 0;
  `,
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
  `,
  thumb: css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 40px;
    height: 44px;
    overflow: hidden;
    border-radius: ${token.borderRadius}px;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
  details: css`
    flex: 1;
    min-width: 0;
  `,
  name: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: ${token.fontSizeSM}px;
    font-weight: 550;
    color: ${token.colorText};
  `,
  meta: css`
    margin-top: 3px;
    color: ${token.colorTextSecondary};
    font-size: 12px;
  `,
}));

const STATUS_LABEL: Record<string, string> = {
  queued: 'У черзі',
  uploading: 'Завантаження',
  processing: 'Обробка файлу',
};

// Rendered in place of MessageAttachments while delivery === 'uploading':
// the message is already in the timeline (sending never waits on uploads),
// so this shows the same drafts the composer was tracking, live.
export function PendingAttachments({ drafts }: { drafts: AttachmentDraft[] }) {
  const { styles } = useStyles();
  if (!drafts.length) return null;
  return (
    <div className={styles.stack}>
      {drafts.map((draft) => (
        <article key={draft.key} className={styles.shell} aria-label={draft.name}>
          <div className={styles.card}>
            <div className={styles.thumb}>
              {draft.previewUrl ? (
                <img src={draft.previewUrl} alt="" />
              ) : (
                <FileIcon size={24} weight="duotone" aria-hidden />
              )}
            </div>
            <div className={styles.details}>
              <div className={styles.name}>{draft.name}</div>
              <div className={styles.meta}>
                {fileExtension(draft.name)} · {formatFileSize(draft.size)} ·{' '}
                {draft.status === 'uploading'
                  ? `${STATUS_LABEL.uploading} ${draft.progress}%`
                  : (STATUS_LABEL[draft.status] ?? STATUS_LABEL.queued)}
              </div>
              {draft.status === 'uploading' && (
                <Progress percent={draft.progress} showInfo={false} size="small" />
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
