import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Platform, useWindowDimensions } from 'react-native';
import {
  AndroidSoftInputModes,
  KeyboardController,
  useGenericKeyboardHandler,
} from 'react-native-keyboard-controller';
import { runOnJS, useSharedValue, withTiming } from 'react-native-reanimated';

import type { PickerTab } from '../types';
import {
  applyInputRequest,
  type ComposerInputRequest,
  type ComposerInputState,
  initialInputState,
} from '../utils/input-state';

export function useComposerInput(onState: (state: ComposerInputState) => void) {
  const [state, setState] = useState(initialInputState);
  const current = useRef(initialInputState);
  const keyboardTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const awaitingKeyboard = useRef(false);
  const { width, height: windowHeight } = useWindowDimensions();
  const keyboardHeight = useSharedValue(0);
  const panelHeight = useSharedValue(0);
  const heldHeight = useSharedValue(0);
  const measuredHeight = useSharedValue(0);
  const mode = useSharedValue(initialInputState.mode);

  const publish = useCallback(
    (next: ComposerInputState) => {
      current.current = next;
      mode.set(next.mode);
      setState(next);
      onState(next);
    },
    [mode, onState],
  );

  const cancelKeyboardWait = useCallback(() => {
    clearTimeout(keyboardTimeout.current);
    awaitingKeyboard.current = false;
  }, []);

  const openPanel = useCallback(() => {
    cancelKeyboardWait();
    // Before the first soft keyboard measurement there is no exact height to reuse.
    // This provisional size is confined to this window, never persisted across devices.
    const height = measuredHeight.get() || Math.min(360, Math.max(240, windowHeight * 0.4));
    panelHeight.set(height);
    heldHeight.set(0);
    void KeyboardController.dismiss();
  }, [cancelKeyboardWait, heldHeight, measuredHeight, panelHeight, windowHeight]);

  const close = useCallback(() => {
    cancelKeyboardWait();
    heldHeight.set(0);
    panelHeight.set(withTiming(0, { duration: 160 }));
    publish({ ...current.current, mode: 'closed' });
    void KeyboardController.dismiss();
  }, [cancelKeyboardWait, heldHeight, panelHeight, publish]);

  const request = useCallback(
    (message: ComposerInputRequest) => {
      const next = applyInputRequest(current.current, message);
      if (next === current.current) return;
      cancelKeyboardWait();
      if (next.mode === 'picker') {
        // Pin native geometry before acknowledging: web may only blur after this ack.
        mode.set('picker');
        openPanel();
      } else if (next.mode === 'keyboard') {
        heldHeight.set(Math.max(panelHeight.get(), keyboardHeight.get()));
        panelHeight.set(0);
        awaitingKeyboard.current = true;
        // Hardware keyboards need no inset and produce no show event.
        keyboardTimeout.current = setTimeout(() => {
          awaitingKeyboard.current = false;
          heldHeight.set(0);
        }, 1200);
      } else {
        heldHeight.set(0);
        panelHeight.set(0);
        void KeyboardController.dismiss();
      }
      publish(next);
    },
    [cancelKeyboardWait, heldHeight, keyboardHeight, mode, openPanel, panelHeight, publish],
  );

  const keyboardEnded = useCallback(
    (height: number) => {
      if (height > 0) {
        cancelKeyboardWait();
        if (current.current.mode === 'closed') publish({ ...current.current, mode: 'keyboard' });
        if (current.current.mode === 'keyboard') heldHeight.set(0);
      } else if (current.current.mode === 'search') {
        publish({ ...current.current, mode: 'picker' });
      } else if (current.current.mode === 'keyboard' && !awaitingKeyboard.current) {
        heldHeight.set(0);
        publish({ ...current.current, mode: 'closed' });
      }
    },
    [cancelKeyboardWait, heldHeight, publish],
  );

  useGenericKeyboardHandler(
    {
      onStart: (event) => {
        'worklet';
        if (event.height > 96 && mode.get() !== 'search') measuredHeight.set(event.height);
      },
      onMove: (event) => {
        'worklet';
        keyboardHeight.set(Math.max(0, event.height));
      },
      onInteractive: (event) => {
        'worklet';
        keyboardHeight.set(Math.max(0, event.height));
      },
      onEnd: (event) => {
        'worklet';
        keyboardHeight.set(Math.max(0, event.height));
        if (event.height > 96 && mode.get() !== 'search') measuredHeight.set(event.height);
        runOnJS(keyboardEnded)(event.height);
      },
    },
    [keyboardEnded],
  );

  const selectTab = useCallback(
    (tab: PickerTab) => {
      mode.set('picker');
      publish({ ...current.current, tab, mode: 'picker' });
      void KeyboardController.dismiss();
    },
    [mode, publish],
  );

  const search = useCallback(() => {
    cancelKeyboardWait();
    publish({ ...current.current, mode: 'search' });
  }, [cancelKeyboardWait, publish]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      KeyboardController.setInputMode(AndroidSoftInputModes.SOFT_INPUT_ADJUST_NOTHING);
    }
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (current.current.mode === 'search') {
        selectTab(current.current.tab);
        return true;
      }
      if (current.current.mode !== 'picker') return false;
      close();
      return true;
    });
    const appState = AppState.addEventListener('change', (status) => {
      if (status !== 'active') close();
    });
    return () => {
      back.remove();
      appState.remove();
      cancelKeyboardWait();
      if (Platform.OS === 'android') KeyboardController.setDefaultMode();
    };
  }, [cancelKeyboardWait, close, selectTab]);

  useEffect(() => {
    measuredHeight.set(0);
  }, [measuredHeight, width, windowHeight]);

  return {
    state,
    mode,
    keyboardHeight,
    panelHeight,
    heldHeight,
    request,
    selectTab,
    search,
    close,
  };
}
