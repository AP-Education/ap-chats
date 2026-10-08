import { IconButton } from '@ap-education/ui';
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  FileIcon,
  PencilSimpleIcon,
  XIcon,
} from '@phosphor-icons/react';
import { Button, Input, Modal, Progress } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { fileExtension, formatFileSize } from '../../../attachments/file-presentation';
import type { AttachmentDraft } from '../../../attachments/types';

const useStyles = createStyles(({ token, css }) => ({
  strip: css`
    display: flex;
    gap: 10px;
    padding: 4px 0 8px;
    overflow-x: auto;
    scrollbar-width: thin;
    scroll-snap-type: x proximity;
  `,
  card: css`
    position: relative;
    flex: 0 0 172px;
    min-width: 0;
    overflow: hidden;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
    scroll-snap-align: start;
    @media (max-width: ${token.screenMD}px) {
      flex-basis: 152px;
    }
    &[data-error] {
      border-color: ${token.colorErrorBorder};
    }
  `,
  media: css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 92px;
    padding: 0;
    border: 0;
    background: ${token.colorFillQuaternary};
    color: ${token.colorTextSecondary};
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    &[type='button'] {
      cursor: zoom-in;
    }
  `,
  actions: css`
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    gap: 4px;
    button {
      background: ${token.colorBgContainer};
      color: ${token.colorText};
      box-shadow: 0 1px 4px ${token.colorFillSecondary};
    }
  `,
  details: css`
    padding: 8px 10px;
    font-size: ${token.fontSizeSM}px;
  `,
  name: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 550;
    color: ${token.colorText};
  `,
  meta: css`
    margin-top: 2px;
    color: ${token.colorTextSecondary};
    font-size: 12px;
  `,
  status: css`
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 22px;
    margin-top: 5px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
    &[data-ready] {
      color: ${token.colorSuccessText};
    }
    &[data-error] {
      color: ${token.colorErrorText};
    }
  `,
  preview: css`
    display: block;
    max-width: 100%;
    max-height: 65dvh;
    margin: auto;
    object-fit: contain;
  `,
  description: css`
    margin-top: 16px;
  `,
}));

interface AttachmentDraftsProps {
  drafts: AttachmentDraft[];
  onRemove: (key: string) => void;
  onRetry: (key: string) => void;
  onDescribe: (key: string, text: string) => void;
}

export function AttachmentDrafts({ drafts, onRemove, onRetry, onDescribe }: AttachmentDraftsProps) {
  const { styles } = useStyles();
  if (!drafts.length) return null;
  return (
    <section aria-label="Вкладення до повідомлення">
      <div className={styles.strip}>
        {drafts.map((draft) => (
          <DraftAttachmentCard
            key={draft.key}
            draft={draft}
            onRemove={onRemove}
            onRetry={onRetry}
            onDescribe={onDescribe}
          />
        ))}
      </div>
    </section>
  );
}

function DraftAttachmentCard({
  draft,
  onRemove,
  onRetry,
  onDescribe,
}: Omit<AttachmentDraftsProps, 'drafts'> & { draft: AttachmentDraft }) {
  const { styles } = useStyles();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(draft.description);
  const failed = draft.status === 'error';
  const ready = draft.status === 'ready';
  let label = 'У черзі';
  if (draft.status === 'uploading') label = `Завантаження ${draft.progress}%`;
  if (draft.status === 'processing') label = 'Обробка файлу';
  if (ready) label = 'Готово';
  if (failed) label = 'Помилка завантаження';

  return (
    <article className={styles.card} data-error={failed || undefined} aria-label={draft.name}>
      {draft.previewUrl ? (
        <button
          type="button"
          className={styles.media}
          onClick={() => setOpen(true)}
          aria-label={`Переглянути ${draft.name}`}
        >
          <img src={draft.previewUrl} alt={draft.description || draft.name} />
        </button>
      ) : (
        <div className={styles.media}>
          <FileIcon size={36} weight="duotone" aria-hidden />
        </div>
      )}
      <div className={styles.actions}>
        {draft.previewUrl && (
          <IconButton
            size={36}
            aria-label={`Опис зображення ${draft.name}`}
            onClick={() => setOpen(true)}
          >
            <PencilSimpleIcon size={17} />
          </IconButton>
        )}
        <IconButton
          size={36}
          aria-label={`Прибрати ${draft.name}`}
          onClick={() => onRemove(draft.key)}
        >
          <XIcon size={17} />
        </IconButton>
      </div>
      <div className={styles.details}>
        <div className={styles.name} title={draft.name}>
          {draft.name}
        </div>
        <div className={styles.meta}>
          {fileExtension(draft.name)} · {formatFileSize(draft.size)}
        </div>
        <div
          className={styles.status}
          data-ready={ready || undefined}
          data-error={failed || undefined}
          role="status"
          aria-live={draft.status === 'uploading' ? 'off' : 'polite'}
        >
          {ready && <CheckCircleIcon size={14} weight="fill" aria-hidden />}
          {label}
        </div>
        {draft.status === 'uploading' && (
          <Progress percent={draft.progress} showInfo={false} size="small" />
        )}
        {failed && (
          <Button
            type="link"
            size="small"
            icon={<ArrowClockwiseIcon size={14} />}
            title={draft.error}
            onClick={() => onRetry(draft.key)}
          >
            Повторити
          </Button>
        )}
      </div>
      <Modal
        open={open}
        title={draft.name}
        okText="Зберегти"
        cancelText="Скасувати"
        onCancel={() => setOpen(false)}
        onOk={() => {
          onDescribe(draft.key, description);
          setOpen(false);
        }}
        destroyOnHidden
      >
        <img
          src={draft.previewUrl}
          className={styles.preview}
          alt={draft.description || draft.name}
        />
        <div className={styles.description}>
          <label htmlFor={`description-${draft.key}`}>Опис зображення</label>
          <Input.TextArea
            id={`description-${draft.key}`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Що зображено? Опис допомагає людям, які користуються екранним читачем."
          />
        </div>
      </Modal>
    </article>
  );
}
