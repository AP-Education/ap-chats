import { useQuery } from '@tanstack/react-query';
import { createStyles } from 'antd-style';
import { useImperativeHandle, useRef, useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationScope } from '@/features/social/conversation/store';
import {
  ComposerEditor,
  type ComposerEditorHandle,
} from '@/features/social/messaging/components/ComposerEditor/ComposerEditor';
import { useMessageEditorSlot } from '@/features/social/messaging/MessageEditorSlot';
import { apiRequest } from '@/shared/api/http';

import { mentionChip, restoreEditor, serializeEditor } from './mention-editor-dom';
import { type MentionCandidate, MentionCandidateList } from './MentionCandidateList';

const MENTION_QUERY_PATTERN = /(?:^|[\s(])@([\p{L}\p{N}._-]{0,80})$/u;

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
    padding: 0 2px;
    border-radius: 2px;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
    font-weight: 500;
  `,
}));

export function MentionEditor() {
  const {
    initialDraft,
    draftKey,
    placeholder,
    ariaLabel,
    className,
    editorStyle,
    autoFocus,
    onChange,
    onSubmit,
    onEscape,
    onPasteFiles,
    editorRef,
  } = useMessageEditorSlot();
  const { styles, cx } = useStyles();
  const { workspaceId, channelId } = useConversationScope();
  const { token } = useQueryAuth();
  const composerRef = useRef<ComposerEditorHandle>(null);
  // Reseeded in onMount whenever the inner ComposerEditor remounts (a new
  // draftKey) rather than only once: this component instance outlives that,
  // since switching drafts no longer remounts MentionEditor itself.
  const labels = useRef<Record<string, string>>(initialDraft?.labels ?? {});
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
    return serializeEditor(composerRef.current?.rootElement() ?? null);
  }

  // Fires on every keystroke and click: the editor's content and/or the caret
  // position may have moved, so both the draft echo and the @-query tracking
  // get re-derived from scratch rather than threaded through as separate state.
  function handleActivity() {
    onChange?.({ markdown: currentMarkdown(), labels: labels.current });
    const root = composerRef.current?.rootElement();
    const selection = window.getSelection();
    if (
      !selection ||
      !selection.isCollapsed ||
      !root?.contains(selection.anchorNode) ||
      selection.anchorNode?.nodeType !== Node.TEXT_NODE
    ) {
      setQuery(null);
      return;
    }
    const before = (selection.anchorNode.textContent ?? '').slice(0, selection.anchorOffset);
    const match = before.match(MENTION_QUERY_PATTERN);
    setQuery(match ? match[1]! : null);
    setActive(0);
  }

  function pick(candidate: MentionCandidate) {
    const selection = window.getSelection();
    if (!selection || !selection.isCollapsed || selection.anchorNode?.nodeType !== Node.TEXT_NODE)
      return;
    const node = selection.anchorNode;
    const before = (node.textContent ?? '').slice(0, selection.anchorOffset);
    const match = before.match(MENTION_QUERY_PATTERN);
    if (!match) return;
    const range = document.createRange();
    range.setStart(node, selection.anchorOffset - match[1]!.length - 1);
    range.setEnd(node, selection.anchorOffset);
    const name = candidate.displayName ?? 'учасник';
    labels.current[candidate.memberId] = name;
    const chip = mentionChip(candidate.memberId, name, styles.chip);
    const fragment = document.createDocumentFragment();
    fragment.append(chip, document.createTextNode(' '));
    composerRef.current?.insertNode(fragment, range);
    setQuery(null);
    handleActivity();
    composerRef.current?.focus();
  }

  useImperativeHandle(editorRef, () => ({
    markdown: currentMarkdown,
    clear: () => {
      composerRef.current?.clear();
      labels.current = {};
      setQuery(null);
      onChange?.({ markdown: '', labels: {} });
    },
    focus: () => composerRef.current?.focus(),
    blur: () => composerRef.current?.blur(),
    insertText: (text) => composerRef.current?.insertText(text),
    saveSelection: () => composerRef.current?.saveSelection(),
    suspendInput: () => composerRef.current?.suspendInput(),
    releaseInput: () => composerRef.current?.releaseInput(),
    resumeInput: (point) => composerRef.current?.resumeInput(point),
    focusAtPoint: (x, y) => composerRef.current?.focusAtPoint(x, y),
  }));

  return (
    <div
      className={styles.wrapper}
      onKeyDownCapture={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Escape' && query !== null) {
          event.preventDefault();
          event.stopPropagation();
          setQuery(null);
          return;
        }
        if (query === null || !candidates.data?.length) return;
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          event.stopPropagation();
          setActive((index) => (index + 1) % candidates.data!.length);
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          event.stopPropagation();
          setActive((index) => (index - 1 + candidates.data!.length) % candidates.data!.length);
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          const candidate = candidates.data[active] ?? candidates.data[0];
          if (candidate) pick(candidate);
        }
      }}
    >
      <ComposerEditor
        key={draftKey}
        editorRef={composerRef}
        onMount={(root) => {
          labels.current = initialDraft?.labels ?? {};
          restoreEditor(root, initialDraft ?? { markdown: '', labels: {} }, styles.chip);
        }}
        className={cx(styles.editor, className)}
        editorStyle={editorStyle}
        ariaLabel={ariaLabel}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={handleActivity}
        onSubmit={onSubmit}
        onEscape={onEscape}
        onPasteFiles={onPasteFiles}
      />
      {query !== null && candidates.data && candidates.data.length > 0 && (
        <MentionCandidateList candidates={candidates.data} active={active} onPick={pick} />
      )}
    </div>
  );
}
