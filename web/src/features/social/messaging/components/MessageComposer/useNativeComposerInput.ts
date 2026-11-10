import { isNativeShell, onNativeMessage, postToNative } from '@ap-education/shell-sdk';
import { useComposer } from '@ap-education/timeline/composer';
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';

import { gifPageUrl } from '../../gifs/gif-links';
import type { PickedGif } from '../../gifs/types';
import { createComposerSessionId, type NativeInputMode, readComposerMessage } from './native-input';
import type { PickerTab } from './picker';

interface NativeComposerInputProps {
  draftKey: string;
  onInsert: (text: string) => void;
  /** A GIF picked in the shell's own panel, with what KLIPY returned for it. */
  onGif: (gif: PickedGif) => void;
  onTab: (tab: PickerTab) => void;
}

/** The shell's own picker, standing in for the keyboard under the composer's words. */
export function useNativeComposerInput({
  draftKey,
  onInsert,
  onGif,
  onTab,
}: NativeComposerInputProps) {
  const sessionId = useMemo(() => `${createComposerSessionId()}:${draftKey}`, [draftKey]);
  const requestId = useRef(0);
  const requestedMode = useRef<NativeInputMode>('closed');
  const focusPoint = useRef<{ x: number; y: number } | undefined>(undefined);
  const focusPending = useRef(false);
  const [activeTab, setActiveTab] = useState<PickerTab | null>(null);
  const receiveInsert = useEffectEvent(onInsert);
  const receiveGif = useEffectEvent(onGif);
  const receiveTab = useEffectEvent(onTab);
  const { suspendInput, releaseInput, resumeInput } = useComposer();
  const suspendWords = useEffectEvent(suspendInput);
  const releaseWords = useEffectEvent(releaseInput);
  const resumeWords = useEffectEvent(resumeInput);

  useEffect(() => {
    if (!isNativeShell()) return;
    requestId.current = 0;
    requestedMode.current = 'closed';
    focusPending.current = false;
    postToNative({ type: 'composer/attach', sessionId });
    const unsubscribe = onNativeMessage<unknown>((value) => {
      const message = readComposerMessage(value, sessionId, requestId.current);
      if (!message) return;
      if (message.type === 'composer/state') {
        const panelOpen = message.mode === 'picker' || message.mode === 'search';
        setActiveTab(panelOpen ? message.tab : null);
        if (panelOpen) {
          suspendWords();
          receiveTab(message.tab);
        } else if (message.mode === 'keyboard' && focusPending.current) {
          focusPending.current = false;
          resumeWords(focusPoint.current);
        } else if (message.mode === 'closed') {
          requestedMode.current = 'closed';
          releaseWords();
        }
      } else if (requestedMode.current === 'picker') {
        if (message.type === 'composer/insert') receiveInsert(message.text);
        else {
          const { slug, title, media, placeholder } = message;
          const { url, width, height } = media;
          receiveGif({
            pageUrl: gifPageUrl(slug),
            title,
            image: { url, width, height },
            placeholder: placeholder ?? null,
          });
        }
      }
    });
    return () => {
      unsubscribe();
      postToNative({ type: 'composer/detach', sessionId });
    };
  }, [sessionId]);

  const request = useCallback(
    (mode: 'closed' | 'keyboard' | 'picker', tab?: PickerTab, point?: { x: number; y: number }) => {
      requestId.current += 1;
      requestedMode.current = mode;
      focusPoint.current = point;
      focusPending.current = mode === 'keyboard';
      setActiveTab(mode === 'picker' ? (tab ?? 'emoji') : null);
      postToNative({ type: 'composer/input', sessionId, requestId: requestId.current, mode, tab });
    },
    [sessionId],
  );

  return useMemo(
    () => ({
      activeTab,
      open: (tab: PickerTab) => request('picker', tab),
      keyboard: (point?: { x: number; y: number }) => request('keyboard', undefined, point),
      close: () => request('closed'),
    }),
    [activeTab, request],
  );
}
