import { useShellLocale } from '@ap-education/shell-sdk';
import { FileIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import { fileExtension, formatFileSize } from '../../attachments/file-presentation';
import type { AttachmentDraft } from '../../attachments/types';

const useStyles = createStyles(({ token, css }) => ({
  stack: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  `,
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
  thumb: css`
    display: grid;
    place-items: center;
    flex: 0 0 44px;
    height: 44px;
    overflow: hidden;
    border-radius: ${token.borderRadiusLG}px;
    background: var(--bubble-accent);
    color: var(--bubble-on-accent, #fff);
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
    color: var(--bubble-text);
  `,
  meta: css`
    margin-top: 2px;
    color: var(--bubble-meta);
    font-size: 12px;
  `,
  progress: css`
    height: 4px;
    margin-top: 6px;
    overflow: hidden;
    border-radius: ${token.borderRadiusXS}px;
    background: var(--bubble-fill);

    span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--bubble-accent);
      transition: width 0.2s ease;
    }
  `,
}));

// Rendered in place of MessageAttachments while delivery === 'uploading':
// the message is already in the timeline (sending never waits on uploads),
// so this shows the same drafts the composer was tracking, live.
export function PendingAttachments({ drafts }: { drafts: AttachmentDraft[] }) {
  const { styles } = useStyles();
  const { t } = useTranslation('messaging');
  const locale = useShellLocale();
  if (!drafts.length) return null;

  function statusLabel(draft: AttachmentDraft) {
    if (draft.status === 'uploading') {
      return t(($) => $.attachments.status.uploading, { progress: draft.progress });
    }
    if (draft.status === 'processing') return t(($) => $.attachments.status.processing);
    return t(($) => $.attachments.status.queued);
  }

  return (
    <div className={styles.stack}>
      {drafts.map((draft) => (
        <article key={draft.key} className={styles.shell} aria-label={draft.name}>
          <div className={styles.card}>
            <div className={styles.thumb}>
              {draft.previewUrl ? (
                <img src={draft.previewUrl} alt="" />
              ) : (
                <FileIcon size={22} weight="fill" aria-hidden />
              )}
            </div>
            <div className={styles.details}>
              <div className={styles.name}>{draft.name}</div>
              <div className={styles.meta}>
                {fileExtension(draft.name, t)} · {formatFileSize(draft.size, locale)} ·{' '}
                {statusLabel(draft)}
              </div>
              {draft.status === 'uploading' && (
                <div className={styles.progress} role="progressbar" aria-valuenow={draft.progress}>
                  <span style={{ width: `${draft.progress}%` }} />
                </div>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
