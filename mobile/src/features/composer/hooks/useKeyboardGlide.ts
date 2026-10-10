import { useCallback, useMemo, useRef } from 'react';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

import {
  DEFAULT_GLIDE_EASING,
  type GlideDirection,
  glideDirection,
  glideEasing,
  type KeyboardFrame,
} from '../utils/keyboard-glide';

// Experiment, on unless built with EXPO_PUBLIC_KEYBOARD_GLIDE=off.
const ENABLED = process.env.EXPO_PUBLIC_KEYBOARD_GLIDE !== 'off';

export interface KeyboardGlide {
  direction: GlideDirection;
  distance: number;
  duration: number;
  easing: string;
}

interface Move {
  direction: GlideDirection;
  from: number;
  to: number;
  started: number;
}

/**
 * The page follows the keyboard with a transform while the WebView keeps its size, so it is laid
 * out once per keyboard move rather than once per frame. `holding` keeps the room beneath the page.
 */
export function useKeyboardGlide(onGlide: (glide: KeyboardGlide | null) => void) {
  const holding = useSharedValue(false);
  const gliding = useSharedValue(false);
  const frames = useSharedValue<KeyboardFrame[]>([]);
  const move = useRef<Move | null>(null);
  // Each move's frames become the curve the next move that way is drawn with, matching this device.
  const curves = useRef<Record<GlideDirection, string>>({
    up: DEFAULT_GLIDE_EASING,
    down: DEFAULT_GLIDE_EASING,
  });

  const announce = useCallback(
    (next: Move, duration: number) => {
      move.current = next;
      const distance = Math.abs(next.to - next.from);
      onGlide({
        direction: next.direction,
        distance,
        duration,
        easing: curves.current[next.direction],
      });
      // Told first, the page holds its place when the WebView grows right after.
      if (next.direction === 'down') holding.set(true);
    },
    [holding, onGlide],
  );

  const learn = useCallback(
    (moved: KeyboardFrame[], ended: number) => {
      const finished = move.current;
      if (finished) {
        const { direction, from, to, started } = finished;
        const curve = glideEasing(moved, from, to, started, ended);
        if (curve) curves.current[direction] = curve;
      }
      move.current = null;
      onGlide(null);
    },
    [onGlide],
  );

  const abandon = useCallback(() => {
    move.current = null;
    onGlide(null);
  }, [onGlide]);

  return useMemo(() => {
    const begin = (from: number, to: number, duration: number, alone: boolean) => {
      'worklet';
      if (gliding.get()) runOnJS(abandon)();

      const direction = ENABLED ? glideDirection(from, to, alone) : null;
      gliding.set(direction !== null);
      frames.set([]);
      // Rising, the room waits from the first frame; falling, only once the page is told.
      holding.set(direction === 'up');

      if (direction) runOnJS(announce)({ direction, from, to, started: Date.now() }, duration);
    };

    const track = (height: number) => {
      'worklet';
      if (gliding.get()) frames.set([...frames.get(), { height, time: Date.now() }]);
    };

    const end = () => {
      'worklet';
      if (!gliding.get()) return;

      gliding.set(false);
      holding.set(false);
      runOnJS(learn)(frames.get(), Date.now());
    };

    return { holding, begin, track, end };
  }, [abandon, announce, frames, gliding, holding, learn]);
}
