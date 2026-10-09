import { createStyles } from 'antd-style';
import { type ComponentProps, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useChannels } from '@/features/communities/channels/hooks/useChannels';
import { useConversationScope } from '@/features/social/conversation/store';
import {
  ComposerEditor,
  type ComposerEditorHandle,
} from '@/features/social/messaging/components/ComposerEditor/ComposerEditor';
import { useMessageEditorSlot } from '@/features/social/messaging/MessageEditorSlot';

import {
  channelChip,
  everyoneChip,
  mentionChip,
  restoreEditor,
  serializeEditor,
} from './mention-editor-dom';
import { type MentionCandidate, MentionCandidateList } from './MentionCandidateList';
import { tokenizeTypedEveryone } from './typed-everyone';
import { type MentionQuery, useMentionCandidates } from './useMentionCandidates';

const MENTION_QUERY_PATTERN = /(?:^|[\s(])([@#])([\p{L}\p{N}._-]{0,80})$/u;

function sameQuery(a: MentionQuery | null, b: MentionQuery | null) {
  return a?.trigger === b?.trigger && a?.text === b?.text;
}

const useStyles = createStyles(({ token, css }) => ({
  wrapper: css`
    position: relative;
    flex: 1;
    min-width: 0;
  `,
  // Its height comes from where it is placed: the composer line or a bubble being edited.
  editor: css`
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
    border-radius: ${token.borderRadiusXS}px;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimaryTextActive};
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
    suggestionsHost,
  } = useMessageEditorSlot();
  const { styles, cx } = useStyles();
  const { workspaceId, composer } = useConversationScope();
  const channels = useChannels(workspaceId);
  const composerRef = useRef<ComposerEditorHandle>(null);
  // Reseeded in onMount whenever the inner ComposerEditor remounts (a new
  // draftKey) rather than only once: this component instance outlives that,
  // since switching drafts no longer remounts MentionEditor itself.
  const labels = useRef<Record<string, string>>(initialDraft?.labels ?? {});
  const [query, setQuery] = useState<MentionQuery | null>(null);
  const [active, setActive] = useState(0);
  const candidates = useMentionCandidates(query);

  function currentMarkdown() {
    const markdown = serializeEditor(composerRef.current?.rootElement() ?? null);
    return composer.mentionEveryone ? tokenizeTypedEveryone(markdown) : markdown;
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
    const nextQuery = match
      ? { trigger: match[1] as MentionQuery['trigger'], text: match[2]! }
      : null;
    // Key-ups land here too; only a new query resets the highlight, not the arrow that moved it.
    if (!sameQuery(nextQuery, query)) setActive(0);
    setQuery(nextQuery);
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
    range.setStart(node, selection.anchorOffset - match[2]!.length - 1);
    range.setEnd(node, selection.anchorOffset);
    const chip = candidateChip(candidate);
    const fragment = document.createDocumentFragment();
    fragment.append(chip, document.createTextNode(' '));
    composerRef.current?.insertNode(fragment, range);
    setQuery(null);
    handleActivity();
    composerRef.current?.focus();
  }

  function candidateChip(candidate: MentionCandidate) {
    if (candidate.kind === 'everyone') return everyoneChip(styles.chip);
    if (candidate.kind === 'channel') {
      const { id, name } = candidate.channel;
      labels.current[id] = name;
      return channelChip(id, name, styles.chip);
    }

    const { memberId, displayName } = candidate.member;
    const name = displayName ?? 'учасник';
    labels.current[memberId] = name;
    return mentionChip(memberId, name, styles.chip);
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
        if (query === null || !candidates.length) return;
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          event.stopPropagation();
          setActive((index) => (index + 1) % candidates.length);
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          event.stopPropagation();
          setActive((index) => (index - 1 + candidates.length) % candidates.length);
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          const candidate = candidates[active] ?? candidates[0];
          if (candidate) pick(candidate);
        }
      }}
    >
      <ComposerEditor
        key={draftKey}
        editorRef={composerRef}
        onMount={(root) => {
          const draft = initialDraft ?? { markdown: '', labels: {} };
          labels.current = draft.labels;
          // A message being edited carries no channel names; the cached channel list has them.
          const channelNames = Object.fromEntries(
            (channels.data ?? []).map(({ id, name }) => [id, name]),
          );
          restoreEditor(
            root,
            { ...draft, labels: { ...channelNames, ...draft.labels } },
            styles.chip,
          );
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
      {query !== null && candidates.length > 0 && (
        <MentionSuggestions
          host={suggestionsHost}
          candidates={candidates}
          subject={query.trigger === '#' ? 'channels' : 'people'}
          query={query.text}
          active={active}
          onActivate={setActive}
          onPick={pick}
        />
      )}
    </div>
  );
}

type MentionSuggestionsProps = Omit<ComponentProps<typeof MentionCandidateList>, 'placement'> & {
  host: HTMLElement | null | undefined;
};

/** Docks in the composer's strip when there is one; an inline editor gets a floating list. */
function MentionSuggestions({ host, ...list }: MentionSuggestionsProps) {
  if (!host) return <MentionCandidateList placement="floating" {...list} />;
  return createPortal(<MentionCandidateList placement="docked" {...list} />, host);
}
