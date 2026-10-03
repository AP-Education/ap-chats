import {
  type RefObject,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { MentionEditorHandle } from '@/features/social/mentions/components/MentionEditor/MentionEditor';
import { isNativeShell, onNativeMessage, postToNative } from '@/shared/lib/nativeBridge';

import { createComposerSessionId, type NativeInputMode, readComposerMessage } from './native-input';
import type { GifResult, PickerTab } from './picker';

interface NativeComposerInputProps {
  draftKey: string;
  editorRef: RefObject<MentionEditorHandle | null>;
  onInsert: (text: string) => void;
  onGif: (gif: Pick<GifResult, 'url' | 'title'>) => void;
  onTab: (tab: PickerTab) => void;
}

export function useNativeComposerInput({
  draftKey,
  editorRef,
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
          editorRef.current?.suspendInput();
          receiveTab(message.tab);
        } else if (message.mode === 'keyboard' && focusPending.current) {
          focusPending.current = false;
          editorRef.current?.resumeInput(focusPoint.current);
        } else if (message.mode === 'closed') {
          requestedMode.current = 'closed';
          editorRef.current?.releaseInput();
        }
      } else if (requestedMode.current === 'picker') {
        if (message.type === 'composer/insert') receiveInsert(message.text);
        else receiveGif(message);
      }
    });
    return () => {
      unsubscribe();
      postToNative({ type: 'composer/detach', sessionId });
    };
  }, [editorRef, sessionId]);

  const request = useCallback(
    (mode: 'closed' | 'keyboard' | 'picker', tab?: PickerTab, point?: { x: number; y: number }) => {
      if (mode === 'picker') editorRef.current?.saveSelection();
      requestId.current += 1;
      requestedMode.current = mode;
      focusPoint.current = point;
      focusPending.current = mode === 'keyboard';
      setActiveTab(mode === 'picker' ? (tab ?? 'emoji') : null);
      postToNative({ type: 'composer/input', sessionId, requestId: requestId.current, mode, tab });
    },
    [editorRef, sessionId],
  );

  return {
    activeTab,
    open: (tab: PickerTab) => request('picker', tab),
    keyboard: (point?: { x: number; y: number }) => request('keyboard', undefined, point),
    close: () => request('closed'),
  };
}
