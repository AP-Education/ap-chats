import { CheckIcon, XIcon } from '@phosphor-icons/react';
import { message as toast } from 'antd';
import { createStyles } from 'antd-style';
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { MessageEditorSlotProvider } from '@/features/social/mentions/MessageEditorSlot';
import type { ComposerEditorApi, ComposerEditorSlotProps } from '@/features/social/mentions/types';
import { ApiError } from '@/shared/api/http';

import { useLinkedGif } from '../../gifs/useLinkedGif';
import type { EditMessage, MessageHistoryItem } from '../../types';
import { MessageInputSurface } from '../MessageInputSurface/MessageInputSurface';

const useStyles = createStyles(({ token, css }) => ({
  editor: css`
    width: 100%;
    min-height: 40px;
    max-height: 240px;
    overflow-y: auto;
    padding: 8px 2px;
    color: ${token.colorText};
    font: inherit;
    font-size: var(--app-text-size, 16px);
  `,
  actions: css`
    display: flex;
    align-items: center;
    gap: 2px;
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
    margin: 8px 0;
    color: ${token.colorWarningText};
    font-size: 12px;
  `,
}));

interface MessageEditorProps {
  item: MessageHistoryItem;
  onEdit: EditMessage;
  onClose: () => void;
  /** The text-input to edit with — e.g. `<MentionEditor />` — wired via MessageEditorSlotProvider. */
  children: ReactNode;
}

export function MessageEditor({ item, onEdit, onClose, children }: MessageEditorProps) {
  const { styles } = useStyles();
  const { t } = useTranslation('messaging');
  const editor = useRef<ComposerEditorApi>(null);
  const [hasContent, setHasContent] = useState(Boolean(item.message.markdown?.trim()));
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const linkedGif = useLinkedGif();
  const labels = useMemo(
    () =>
      Object.fromEntries(
        item.mentions?.map(({ memberId, displayName }) => [
          memberId,
          displayName ?? t(($) => $.editor.mentionFallback),
        ]) ?? [],
      ),
    [item.mentions, t],
  );

  const save = useCallback(
    async (overwrite = false) => {
      const markdown = editor.current?.draft().markdown.trim();
      if (markdown === undefined || (!markdown && !item.message.attachments?.length) || saving)
        return;
      setSaving(true);
      try {
        const blocks = await linkedGif.blocksFor(markdown, item.message.blocks);
        await onEdit(item, { markdown, ...(blocks ? { blocks } : {}) }, overwrite);
        onClose();
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) setConflict(true);
        else toast.error(t(($) => $.editor.saveFailed));
      } finally {
        setSaving(false);
      }
    },
    [item, saving, onEdit, onClose, linkedGif, t],
  );

  const slot = useMemo<ComposerEditorSlotProps>(
    () => ({
      editorRef: editor,
      initialDraft: { markdown: item.message.markdown ?? '', labels },
      className: styles.editor,
      autoFocus: true,
      ariaLabel: t(($) => $.editor.label),
      onChange: ({ markdown }) => setHasContent(Boolean(markdown.trim())),
      onSubmit: () => void save(),
      onEscape: onClose,
    }),
    [item, labels, styles.editor, onClose, save, t],
  );

  return (
    <>
      <MessageInputSurface
        compact
        trailing={
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.action}
              aria-label={t(($) => $.editor.cancel)}
              onClick={onClose}
            >
              <XIcon size={18} />
            </button>
            <button
              type="button"
              className={styles.action}
              aria-label={t(($) => $.editor.save)}
              disabled={saving || (!hasContent && !item.message.attachments?.length)}
              onClick={() => void save()}
            >
              <CheckIcon size={18} />
            </button>
          </div>
        }
      >
        <MessageEditorSlotProvider slot={slot}>{children}</MessageEditorSlotProvider>
      </MessageInputSurface>
      {conflict && (
        <div className={styles.conflict} role="alert">
          {t(($) => $.editor.conflict)}
          <button type="button" onClick={() => void save(true)}>
            {t(($) => $.editor.overwrite)}
          </button>
        </div>
      )}
    </>
  );
}
