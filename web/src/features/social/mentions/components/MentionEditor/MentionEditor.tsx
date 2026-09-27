import { useQuery } from '@tanstack/react-query';
import { createStyles } from 'antd-style';
import { type KeyboardEvent, type Ref, useImperativeHandle, useRef, useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationScope } from '@/features/social/conversation/store';
import { apiRequest } from '@/shared/api/http';

import {
  mentionChip,
  type MentionDraft,
  restoreEditor,
  serializeEditor,
} from './mention-editor-dom';
import { type MentionCandidate, MentionCandidateList } from './MentionCandidateList';

export interface MentionEditorHandle {
  markdown: () => string;
  clear: () => void;
  focus: () => void;
  insertText: (text: string) => void;
}

interface MentionEditorProps {
  initialDraft?: MentionDraft;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  onChange?: (draft: MentionDraft) => void;
  onSubmit?: () => void;
  onEscape?: () => void;
  editorRef?: Ref<MentionEditorHandle>;
}

const useStyles = createStyles(({ token, css }) => ({
  wrapper: css`
    position: relative;
    flex: 1;
    min-width: 0;
  `,
  editor: css`
    min-height: 40px;
    outline: none;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    &:empty::before {
      content: attr(data-placeholder);
      color: ${token.colorTextQuaternary};
      pointer-events: none;
    }
  `,
  chip: css`
    display: inline;
    padding: 1px 3px;
    border-radius: 4px;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimaryText};
    font-weight: 600;
  `,
}));

export function MentionEditor({
  initialDraft,
  placeholder,
  ariaLabel,
  className,
  onChange,
  onSubmit,
  onEscape,
  editorRef,
}: MentionEditorProps) {
  const { styles, cx } = useStyles();
  const { workspaceId, channelId } = useConversationScope();
  const { token } = useQueryAuth();
  const root = useRef<HTMLDivElement>(null);
  const draft = useRef<MentionDraft>(initialDraft ?? { markdown: '', labels: {} });
  const labels = useRef<Record<string, string>>(initialDraft?.labels ?? {});
  const initialized = useRef(false);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const candidates = useQuery({
    queryKey: ['mention-candidates', workspaceId, channelId, query],
    queryFn: () =>
      apiRequest<MentionCandidate[]>(
        `/api/workspaces/${workspaceId}/channels/${channelId}/mention-candidates?q=${encodeURIComponent(query ?? '')}`,
        token as string,
      ),
    enabled: Boolean(token && query !== null),
    staleTime: 30_000,
  });

  function currentMarkdown() {
    return serializeEditor(root.current);
  }
  function sync() {
    onChange?.({ markdown: currentMarkdown(), labels: labels.current });
    const selection = window.getSelection();
    if (
      !selection ||
      !selection.isCollapsed ||
      !root.current?.contains(selection.anchorNode) ||
      selection.anchorNode?.nodeType !== Node.TEXT_NODE
    ) {
      setQuery(null);
      return;
    }
    const before = (selection.anchorNode.textContent ?? '').slice(0, selection.anchorOffset);
    const match = before.match(/(?:^|[\s(])@([\p{L}\p{N}._-]{0,80})$/u);
    setQuery(match ? match[1]! : null);
    setActive(0);
  }

  function pick(candidate: MentionCandidate) {
    const selection = window.getSelection();
    if (!selection || !selection.isCollapsed || selection.anchorNode?.nodeType !== Node.TEXT_NODE)
      return;
    const node = selection.anchorNode;
    const before = (node.textContent ?? '').slice(0, selection.anchorOffset);
    const match = before.match(/(?:^|[\s(])@([\p{L}\p{N}._-]{0,80})$/u);
    if (!match) return;
    const range = document.createRange();
    range.setStart(node, selection.anchorOffset - match[1]!.length - 1);
    range.setEnd(node, selection.anchorOffset);
    range.deleteContents();
    const name = candidate.displayName ?? 'учасник';
    labels.current[candidate.memberId] = name;
    const chip = mentionChip(candidate.memberId, name, styles.chip);
    range.insertNode(chip);
    const space = document.createTextNode(' ');
    chip.after(space);
    range.setStartAfter(space);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    setQuery(null);
    sync();
    root.current?.focus();
  }

  function insertText(text: string) {
    root.current?.focus();
    const selection = window.getSelection();
    if (!selection || !root.current) return;
    if (!root.current.contains(selection.anchorNode)) {
      const end = document.createRange();
      end.selectNodeContents(root.current);
      end.collapse(false);
      selection.removeAllRanges();
      selection.addRange(end);
    }
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    sync();
  }

  useImperativeHandle(editorRef, () => ({
    markdown: currentMarkdown,
    clear: () => {
      root.current?.replaceChildren();
      labels.current = {};
      setQuery(null);
      onChange?.({ markdown: '', labels: {} });
    },
    focus: () => root.current?.focus(),
    insertText,
  }));

  return (
    <div className={styles.wrapper}>
      <div
        ref={(node) => {
          root.current = node;
          if (node && !initialized.current) {
            restoreEditor(node, draft.current, styles.chip);
            initialized.current = true;
          }
        }}
        className={cx(styles.editor, className)}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        onInput={sync}
        onClick={sync}
        onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
          if (event.nativeEvent.isComposing) return;
          if (query !== null && candidates.data?.length) {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActive((index) => (index + 1) % candidates.data!.length);
              return;
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive((index) => (index - 1 + candidates.data!.length) % candidates.data!.length);
              return;
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              const candidate = candidates.data[active] ?? candidates.data[0];
              if (candidate) pick(candidate);
              return;
            }
          }
          if (event.key === 'Escape') {
            if (query !== null) {
              event.preventDefault();
              setQuery(null);
            } else onEscape?.();
            return;
          }
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSubmit?.();
          }
        }}
        onPaste={(event) => {
          event.preventDefault();
          insertText(event.clipboardData.getData('text/plain'));
        }}
      />
      {query !== null && candidates.data && candidates.data.length > 0 && (
        <MentionCandidateList candidates={candidates.data} active={active} onPick={pick} />
      )}
    </div>
  );
}
