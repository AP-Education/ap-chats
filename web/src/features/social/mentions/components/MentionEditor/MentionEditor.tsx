import {
  ComposerEditable,
  type ComposerEditableHandle,
  serializeEditable,
  useComposerEditorSlot,
} from '@ap-education/timeline/composer';
import { type ComponentProps, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useChannels } from '@/features/communities/channels/hooks/useChannels';
import { useRoles } from '@/features/roles/hooks/useRoles';
import { useConversationScope } from '@/features/social/conversation-scope/store';

import { restoreEditor, tokenChip } from './mention-editor-dom';
import styles from './MentionEditor.module.css';
import { SuggestionList } from './SuggestionList';
import type { Suggestion, SuggestionQuery } from './suggestions';
import { tokenizeTypedEveryone } from './typed-everyone';
import { useChannelSuggestions } from './useChannelSuggestions';
import { usePeopleSuggestions } from './usePeopleSuggestions';

const SUGGESTION_QUERY_PATTERN = /(?:^|[\s(])([@#])([\p{L}\p{N}._-]{0,80})$/u;

function sameQuery(a: SuggestionQuery | null, b: SuggestionQuery | null) {
  return a?.trigger === b?.trigger && a?.text === b?.text;
}

export function MentionEditor() {
  const {
    initialDraft,
    draftKey,
    placeholder,
    label,
    autoFocus,
    onChange,
    onSubmit,
    onEscape,
    onPasteFiles,
    onPointerDown,
    editorRef,
    suggestionsHost,
  } = useComposerEditorSlot();
  const { workspaceId, composer } = useConversationScope();
  const channels = useChannels(workspaceId);
  const { query: roles } = useRoles(workspaceId);
  const editableRef = useRef<ComposerEditableHandle>(null);
  // Reseeded in onMount whenever the inner editable remounts (a new
  // draftKey) rather than only once: this component instance outlives that,
  // since switching drafts no longer remounts MentionEditor itself.
  const labels = useRef<Record<string, string>>(initialDraft.labels);
  const [query, setQuery] = useState<SuggestionQuery | null>(null);
  const [active, setActive] = useState(0);
  const peopleSuggestions = usePeopleSuggestions(query);
  const channelSuggestions = useChannelSuggestions(query);
  // Each source answers only its own trigger.
  const suggestions = peopleSuggestions ?? channelSuggestions;
  const items = suggestions?.items ?? [];

  // TODO(everyone): every outgoing @everyone, picked or typed, passes here; confirm before a big channel.
  function currentMarkdown() {
    const markdown = serializeEditable(editableRef.current?.root() ?? null);
    return composer.groupMentions ? tokenizeTypedEveryone(markdown) : markdown;
  }

  function currentDraft() {
    return { markdown: currentMarkdown(), labels: labels.current };
  }

  // Fires on every keystroke and click: the editor's content and/or the caret
  // position may have moved, so both the draft echo and the suggestion query
  // get re-derived from scratch rather than threaded through as separate state.
  function handleActivity() {
    onChange(currentDraft());
    const root = editableRef.current?.root();
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
    const match = before.match(SUGGESTION_QUERY_PATTERN);
    const nextQuery = match
      ? { trigger: match[1] as SuggestionQuery['trigger'], text: match[2]! }
      : null;
    // Key-ups land here too; only a new query resets the highlight, not the arrow that moved it.
    if (!sameQuery(nextQuery, query)) setActive(0);
    setQuery(nextQuery);
  }

  function pick({ token, label }: Suggestion) {
    const selection = window.getSelection();
    if (!selection || !selection.isCollapsed || selection.anchorNode?.nodeType !== Node.TEXT_NODE)
      return;
    const node = selection.anchorNode;
    const before = (node.textContent ?? '').slice(0, selection.anchorOffset);
    const match = before.match(SUGGESTION_QUERY_PATTERN);
    if (!match) return;
    const range = document.createRange();
    range.setStart(node, selection.anchorOffset - match[2]!.length - 1);
    range.setEnd(node, selection.anchorOffset);
    if (token.kind !== 'everyone') labels.current[token.id] = label;
    const fragment = document.createDocumentFragment();
    fragment.append(tokenChip(token, labels.current, styles.chip), document.createTextNode(' '));
    editableRef.current?.insertNode(fragment, range);
    setQuery(null);
    handleActivity();
    editableRef.current?.focus();
  }

  useImperativeHandle(editorRef, () => ({
    draft: currentDraft,
    clear: () => {
      editableRef.current?.clear();
      labels.current = {};
      setQuery(null);
      onChange({ markdown: '', labels: {} });
    },
    focus: () => editableRef.current?.focus(),
    blur: () => editableRef.current?.blur(),
    insertText: (text) => editableRef.current?.insertText(text),
    suspendInput: () => editableRef.current?.suspendInput(),
    releaseInput: () => editableRef.current?.releaseInput(),
    resumeInput: (point) => editableRef.current?.resumeInput(point),
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
        if (!items.length) return;
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          event.stopPropagation();
          setActive((index) => (index + 1) % items.length);
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          event.stopPropagation();
          setActive((index) => (index - 1 + items.length) % items.length);
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          const suggestion = items[active] ?? items[0];
          if (suggestion) pick(suggestion);
        }
      }}
    >
      <ComposerEditable
        key={draftKey}
        editableRef={editableRef}
        onMount={(root) => {
          labels.current = initialDraft.labels;
          // A message being edited carries no channel or role names; the cached lists have them.
          const listedNames = Object.fromEntries(
            [...(channels.data ?? []), ...(roles.data ?? [])].map(({ id, name }) => [id, name]),
          );
          restoreEditor(
            root,
            { ...initialDraft, labels: { ...listedNames, ...initialDraft.labels } },
            styles.chip,
          );
        }}
        className={styles.editor}
        label={label}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={handleActivity}
        onSubmit={onSubmit}
        onEscape={onEscape}
        onPasteFiles={onPasteFiles}
        onPointerDown={onPointerDown}
      />
      {query && suggestions && items.length > 0 && (
        <SuggestionPopup
          host={suggestionsHost}
          group={suggestions}
          query={query.text}
          active={active}
          onActivate={setActive}
          onPick={pick}
        />
      )}
    </div>
  );
}

type SuggestionPopupProps = Omit<ComponentProps<typeof SuggestionList>, 'placement'> & {
  host: HTMLElement | null | undefined;
};

/** Docks in the composer's strip when there is one; an inline editor gets a floating list. */
function SuggestionPopup({ host, ...list }: SuggestionPopupProps) {
  if (!host) return <SuggestionList placement="floating" {...list} />;
  return createPortal(<SuggestionList placement="docked" {...list} />, host);
}
