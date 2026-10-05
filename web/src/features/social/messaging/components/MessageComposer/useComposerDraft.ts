import { useCallback, useMemo, useState } from 'react';

import type { ComposerDraft } from '../../types';

function readDraft(key: string): ComposerDraft {
  const stored = localStorage.getItem(key);
  if (!stored) return { markdown: '', labels: {} };
  try {
    const value = JSON.parse(stored) as { markdown?: string; labels?: Record<string, string> };
    if (typeof value.markdown === 'string')
      return { markdown: value.markdown, labels: value.labels ?? {} };
  } catch {
    return { markdown: stored, labels: {} };
  }
  return { markdown: '', labels: {} };
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
    hasContent: Boolean(initialDraft.markdown.trim()),
  }));
  const hasContent =
    contentState.draftKey === draftKey
      ? contentState.hasContent
      : Boolean(readDraft(draftKey).markdown.trim());

  const sync = useCallback(
    ({ markdown, labels }: ComposerDraft) => {
      if (markdown) localStorage.setItem(draftKey, JSON.stringify({ markdown, labels }));
      else localStorage.removeItem(draftKey);
      setContentState({ draftKey, hasContent: markdown.trim().length > 0 });
    },
    [draftKey],
  );

  const clear = useCallback(() => {
    localStorage.removeItem(draftKey);
    setContentState({ draftKey, hasContent: false });
  }, [draftKey]);

  return { initialDraft, hasContent, sync, clear };
}
