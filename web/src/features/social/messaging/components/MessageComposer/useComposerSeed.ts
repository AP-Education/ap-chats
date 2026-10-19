import { type RefObject, useEffect } from 'react';

import type { ComposerEditorApi } from '@/features/social/mentions/types';

import type { UploadFile } from '../../attachments/upload-file';
import { useComposerSeeds } from '../../composer-seed';

interface SeedTargets {
  editorRef: RefObject<ComposerEditorApi | null>;
  /** Unset until the conversation's file limits are known, which adding files needs. */
  addFiles: ((files: UploadFile[]) => void) | undefined;
}

/** Puts what was handed to this conversation's composer into it, once it can take the files too. */
export function useComposerSeed(channelId: string, { editorRef, addFiles }: SeedTargets) {
  const seed = useComposerSeeds((state) => state.byChannel[channelId]);

  useEffect(() => {
    // Read again rather than trusted from the render: a repeated effect must not put it in twice.
    const pending = useComposerSeeds.getState().byChannel[channelId];
    if (!seed || pending !== seed || !addFiles) return;

    useComposerSeeds.getState().take(channelId);
    if (seed.text) editorRef.current?.insertText(seed.text);
    if (seed.files.length) addFiles(seed.files);
  }, [seed, addFiles, channelId, editorRef]);
}
