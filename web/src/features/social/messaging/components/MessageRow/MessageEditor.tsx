import { CheckIcon, XIcon } from '@phosphor-icons/react';
import { message as toast } from 'antd';
import { createStyles } from 'antd-style';
import { useRef, useState } from 'react';

import {
  MentionEditor,
  type MentionEditorHandle,
} from '@/features/social/mentions/components/MentionEditor/MentionEditor';
import { ApiError } from '@/shared/api/http';

import type { HistoryItem } from '../../types';

const useStyles = createStyles(({ token, css }) => ({
  editor: css`
    width: 100%;
    min-height: 80px;
    padding: 8px;
    border: 1px solid ${token.colorPrimaryBorder};
    border-radius: 7px;
    background: ${token.colorBgContainer};
    color: ${token.colorText};
    font: inherit;
  `,
  actions: css`
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 5px;
  `,
  action: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 29px;
    height: 28px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: ${token.colorTextSecondary};
    cursor: pointer;

    &:hover {
      background: ${token.colorFillTertiary};
      color: ${token.colorText};
    }
  `,
  conflict: css`
    margin-top: 6px;
    color: ${token.colorWarningText};
    font-size: 12px;
  `,
}));

interface MessageEditorProps {
  item: HistoryItem;
  onEdit: (item: HistoryItem, markdown: string, overwrite?: boolean) => Promise<void>;
  onClose: () => void;
}

export function MessageEditor({ item, onEdit, onClose }: MessageEditorProps) {
  const { styles } = useStyles();
  const editor = useRef<MentionEditorHandle>(null);
  const [hasContent, setHasContent] = useState(Boolean(item.message.markdown?.trim()));
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const labels = Object.fromEntries(
    item.mentions?.map(({ memberId, displayName }) => [memberId, displayName ?? 'учасник']) ?? [],
  );

  async function save(overwrite = false) {
    const markdown = editor.current?.markdown().trim();
    if (!markdown || saving) return;
    setSaving(true);
    try {
      await onEdit(item, markdown, overwrite);
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setConflict(true);
      else toast.error('Не вдалося зберегти. Перевірте зміни й спробуйте ще раз.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <MentionEditor
        editorRef={editor}
        initialDraft={{ markdown: item.message.markdown ?? '', labels }}
        className={styles.editor}
        ariaLabel="Редагувати повідомлення"
        onChange={({ markdown }) => setHasContent(Boolean(markdown.trim()))}
        onSubmit={() => void save()}
        onEscape={onClose}
      />
      {conflict && (
        <div className={styles.conflict} role="alert">
          Повідомлення змінилося на іншому пристрої. Ваш текст збережено тут.
          <button type="button" onClick={() => void save(true)}>
            Зберегти поверх
          </button>
        </div>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.action}
          aria-label="Скасувати редагування"
          onClick={onClose}
        >
          <XIcon size={17} />
        </button>
        <button
          type="button"
          className={styles.action}
          aria-label="Зберегти зміни"
          disabled={saving || !hasContent}
          onClick={() => void save()}
        >
          <CheckIcon size={17} />
        </button>
      </div>
    </>
  );
}
