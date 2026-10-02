import { useQuery } from '@tanstack/react-query';
import { createStyles } from 'antd-style';
import {
  type CSSProperties,
  type KeyboardEvent,
  type Ref,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

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
  blur: () => void;
  insertText: (text: string) => void;
  /** 'none' lets code call focus()/insertText() (e.g. inserting from the mobile picker
   * panel) without summoning the on-screen keyboard back over the panel. */
  setInputMode: (mode: 'text' | 'none') => void;
}

interface MentionEditorProps {
  initialDraft?: MentionDraft;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  editorStyle?: CSSProperties;
  autoFocus?: boolean;
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
      display: block;
      max-width: 100%;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: ${token.colorTextQuaternary};
      pointer-events: none;
    }
  `,
  chip: css`
    display: inline;
    padding: 0 2px;
    border-radius: 2px;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
    font-weight: 500;
  `,
}));

export function MentionEditor({
  initialDraft,
  placeholder,
  ariaLabel,
  className,
  editorStyle,
  autoFocus,
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
  // Tracks the caret position while it's inside this editor. Blurring (e.g. to open the
  // mobile picker sheet) moves or clears the live Selection, so without this, inserting
  // afterwards (insertText) would fall back to "append at the end" instead of wherever
  // the user had actually placed the caret.
  const lastRange = useRef<Range | null>(null);
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

  // Called only from handlers that already fired ON this editor (click/input/keyup) —
  // deliberately not a document-wide `selectionchange` listener. That event is fired
  // async and its timing relative to focus moving to another element (the picker's
  // search input, a category button) isn't reliably ordered, so a global listener could
  // occasionally capture a stale/collapsed range and silently corrupt the caret position
  // it's supposed to remember.
  function captureSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !root.current) return;
    const range = selection.getRangeAt(0);
    if (root.current.contains(range.commonAncestorContainer)) {
      lastRange.current = range.cloneRange();
    }
  }

  function currentMarkdown() {
    return serializeEditor(root.current);
  }
  function sync() {
    captureSelection();
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
    const selection = window.getSelection();
    // Check validity BEFORE focus() — Chrome's default behavior when a contenteditable
    // is refocused with no live selection already inside it is to silently place the
    // caret at position 0, which then reads as "already a valid in-root selection" to
    // this same check if it ran after focus(), permanently hiding the real caret the
    // user left behind (e.g. when the picker's own blur() moved selection away).
    const wasValid = Boolean(
      root.current && selection && root.current.contains(selection.anchorNode),
    );
    root.current?.focus();
    if (!selection || !root.current) return;
    if (!wasValid) {
      const restored = lastRange.current;
      const fallback = document.createRange();
      if (restored && root.current.contains(restored.commonAncestorContainer)) {
        fallback.setStart(restored.startContainer, restored.startOffset);
        fallback.setEnd(restored.endContainer, restored.endOffset);
      } else {
        fallback.selectNodeContents(root.current);
        fallback.collapse(false);
      }
      selection.removeAllRanges();
      selection.addRange(fallback);
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
    blur: () => root.current?.blur(),
    setInputMode: (mode) => {
      if (root.current) root.current.inputMode = mode;
    },
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
            if (autoFocus) node.focus();
          }
        }}
        className={cx(styles.editor, className)}
        style={editorStyle}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        onInput={sync}
        onClick={sync}
        onKeyUp={sync}
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
