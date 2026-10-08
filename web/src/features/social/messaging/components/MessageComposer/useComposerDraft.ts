import { useCallback, useMemo, useState } from 'react';

import type { ComposerDraft } from '../../types';

const EMPTY_DRAFT: ComposerDraft = { markdown: '', labels: {} };

// A draft of nothing but line breaks is no draft: restoring it would fill the field with
// invisible text and hide the placeholder.
function hasText(markdown: string): boolean {
  return markdown.trim().length > 0;
}

function readDraft(key: string): ComposerDraft {
  const stored = localStorage.getItem(key);
  if (!stored) return EMPTY_DRAFT;
  try {
    const value = JSON.parse(stored) as { markdown?: string; labels?: Record<string, string> };
    if (typeof value.markdown === 'string' && hasText(value.markdown))
      return { markdown: value.markdown, labels: value.labels ?? {} };
  } catch {
    if (hasText(stored)) return { markdown: stored, labels: {} };
  }
  return EMPTY_DRAFT;
}

/**
 * The composer's text draft, persisted to localStorage so it survives a
 * reload or a channel switch and back. `hasContent` falls back to reading
 * localStorage directly when `draftKey` has just changed (e.g. switching
 * channels) and this hook's own state hasn't caught up yet, so a composer
 * never flashes the previous channel's content state for one render.
 */
export function useComposerDraft(draftKey: string) {
  const initialDraft = useMemo(() => readDraft(draftKey), [draftKey]);
  const [contentState, setContentState] = useState(() => ({
    draftKey,
    hasContent: hasText(initialDraft.markdown),
  }));
  const hasContent =
    contentState.draftKey === draftKey
      ? contentState.hasContent
      : hasText(readDraft(draftKey).markdown);

  const sync = useCallback(
    ({ markdown, labels }: ComposerDraft) => {
      const hasContent = hasText(markdown);
      if (hasContent) localStorage.setItem(draftKey, JSON.stringify({ markdown, labels }));
      else localStorage.removeItem(draftKey);
      setContentState({ draftKey, hasContent });
    },
    [draftKey],
  );

  const clear = useCallback(() => {
    localStorage.removeItem(draftKey);
    setContentState({ draftKey, hasContent: false });
  }, [draftKey]);

  return { initialDraft, hasContent, sync, clear };
}
