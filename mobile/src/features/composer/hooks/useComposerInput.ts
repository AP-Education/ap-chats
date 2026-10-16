import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, useWindowDimensions } from 'react-native';
import {
  AndroidSoftInputModes,
  KeyboardController,
  useGenericKeyboardHandler,
} from 'react-native-keyboard-controller';
import { runOnJS, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';

import type { PickerTab } from '../types';
import {
  applyInputRequest,
  type ComposerInputRequest,
  type ComposerInputState,
  initialInputState,
  inputAreaHeight,
} from '../utils/input-state';
import { DEFAULT_EASING, type InsetMotion } from '../utils/keyboard-curve';
import { useKeyboardCurves } from './useKeyboardCurves';

const PANEL_CLOSE_MS = 160;
const INSTANT: InsetMotion = { duration: 0, easing: DEFAULT_EASING };

interface InputAreaLayout {
  /** Kept below the page even while nothing is open, where the page can't pad itself. */
  reservedInset: number;
  containerHeight: number;
}

/**
 * The native input beneath the page: the keyboard, or the emoji panel in its place. The page is
 * never resized for it; `onRoom` tells the page each new height it covers, and how it gets there.
 */
export function useComposerInput(
  onState: (state: ComposerInputState) => void,
  onRoom: (room: number, motion: InsetMotion) => void,
  { reservedInset, containerHeight }: InputAreaLayout,
) {
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
  // Where the keyboard and the panel are heading, and how: the page moves once per change.
  const keyboardTarget = useSharedValue(0);
  const panelTarget = useSharedValue(0);
  const motion = useSharedValue(INSTANT);
  const curves = useKeyboardCurves();

  const movePanel = useCallback(
    (height: number, duration = 0) => {
      motion.set({ duration, easing: DEFAULT_EASING });
      panelTarget.set(height);
      panelHeight.set(duration ? withTiming(height, { duration }) : height);
    },
    [motion, panelHeight, panelTarget],
  );

  const hold = useCallback(
    (height: number) => {
      motion.set(INSTANT);
      heldHeight.set(height);
    },
    [heldHeight, motion],
  );

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
    movePanel(height);
    hold(0);
    void KeyboardController.dismiss();
  }, [cancelKeyboardWait, hold, measuredHeight, movePanel, windowHeight]);

  const close = useCallback(() => {
    cancelKeyboardWait();
    hold(0);
    movePanel(0, PANEL_CLOSE_MS);
    publish({ ...current.current, mode: 'closed' });
    void KeyboardController.dismiss();
  }, [cancelKeyboardWait, hold, movePanel, publish]);

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
        hold(Math.max(panelHeight.get(), keyboardHeight.get()));
        movePanel(0);
        awaitingKeyboard.current = true;
        // Hardware keyboards need no inset and produce no show event.
        keyboardTimeout.current = setTimeout(() => {
          awaitingKeyboard.current = false;
          hold(0);
        }, 1200);
      } else {
        hold(0);
        movePanel(0);
        void KeyboardController.dismiss();
      }
      publish(next);
    },
    [cancelKeyboardWait, hold, keyboardHeight, mode, movePanel, openPanel, panelHeight, publish],
  );

  const keyboardEnded = useCallback(
    (height: number) => {
      if (height > 0) {
        cancelKeyboardWait();
        if (current.current.mode === 'closed') publish({ ...current.current, mode: 'keyboard' });
        if (current.current.mode === 'keyboard') hold(0);
      } else if (current.current.mode === 'search') {
        publish({ ...current.current, mode: 'picker' });
      } else if (current.current.mode === 'keyboard' && !awaitingKeyboard.current) {
        hold(0);
        publish({ ...current.current, mode: 'closed' });
      }
    },
    [cancelKeyboardWait, hold, publish],
  );

  const measure = (height: number) => {
    'worklet';
    if (height > 96 && mode.get() !== 'search') measuredHeight.set(height);
  };

  useGenericKeyboardHandler(
    {
      onStart: (event) => {
        'worklet';
        const from = keyboardHeight.get();
        const to = Math.max(0, event.height);
        measure(event.height);
        curves.begin(from, to);
        motion.set(curves.motion(from, to, event.duration));
        keyboardTarget.set(to);
      },
      onMove: (event) => {
        'worklet';
        keyboardHeight.set(Math.max(0, event.height));
        curves.track(event.height);
      },
      onInteractive: (event) => {
        'worklet';
        keyboardHeight.set(Math.max(0, event.height));
      },
      onEnd: (event) => {
        'worklet';
        const height = Math.max(0, event.height);
        keyboardHeight.set(height);
        measure(event.height);
        curves.end();
        // A keyboard dragged away ends somewhere its start never announced.
        if (keyboardTarget.get() !== height) {
          motion.set(INSTANT);
          keyboardTarget.set(height);
        }
        runOnJS(keyboardEnded)(event.height);
      },
    },
    [keyboardEnded, curves],
  );

  useAnimatedReaction(
    () =>
      inputAreaHeight(
        mode.get(),
        keyboardTarget.get(),
        panelTarget.get(),
        heldHeight.get(),
        reservedInset,
        containerHeight,
      ),
    (room, previous) => {
      if (room !== previous) runOnJS(onRoom)(room, motion.get());
    },
    [onRoom, reservedInset, containerHeight],
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

  /** Android's back: search returns to its picker, the picker closes; false when neither shows. */
  const back = useCallback((): boolean => {
    if (current.current.mode === 'search') {
      selectTab(current.current.tab);
      return true;
    }
    if (current.current.mode !== 'picker') return false;

    close();
    return true;
  }, [close, selectTab]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      KeyboardController.setInputMode(AndroidSoftInputModes.SOFT_INPUT_ADJUST_NOTHING);
    }
    const appState = AppState.addEventListener('change', (status) => {
      if (status !== 'active') close();
    });
    return () => {
      appState.remove();
      cancelKeyboardWait();
      if (Platform.OS === 'android') KeyboardController.setDefaultMode();
    };
  }, [cancelKeyboardWait, close]);

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
    back,
  };
}
