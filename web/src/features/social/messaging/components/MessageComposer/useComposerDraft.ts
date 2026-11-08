import { useCallback, useMemo, useState } from 'react';

import type { ComposerDraft } from '@/features/social/mentions/types';

import { parseComposerDraft } from './composer-draft';

/** Text and its private audience survive reloads and navigation together. */
export function useComposerDraft(draftKey: string) {
  const initialDraft = useMemo(
    () => parseComposerDraft(localStorage.getItem(draftKey)),
    [draftKey],
  );
  const [state, setState] = useState(() => ({ draftKey, draft: initialDraft }));
  const draft = state.draftKey === draftKey ? state.draft : initialDraft;
  const sync = useCallback(
    (text: ComposerDraft, assistant: boolean) => {
      const draft = { ...text, assistant };
      if (text.markdown.trim() || assistant) localStorage.setItem(draftKey, JSON.stringify(draft));
      else localStorage.removeItem(draftKey);
      setState({ draftKey, draft });
    },
    [draftKey],
  );
  const clear = useCallback(
    (assistant: boolean) => sync({ markdown: '', labels: {} }, assistant),
    [sync],
  );
  return {
    initialDraft,
    hasContent: Boolean(draft.markdown.trim()),
    assistant: draft.assistant,
    sync,
    clear,
  };
}
