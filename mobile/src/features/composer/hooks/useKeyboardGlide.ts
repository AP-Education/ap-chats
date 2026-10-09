import { useCallback, useMemo, useRef } from 'react';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

import {
  DEFAULT_GLIDE_EASING,
  type GlideDirection,
  glideDirection,
  glideEasing,
} from '../utils/keyboard-glide';

// Experiment, on unless built with EXPO_PUBLIC_KEYBOARD_GLIDE=off.
const ENABLED = process.env.EXPO_PUBLIC_KEYBOARD_GLIDE !== 'off';

/** A keyboard starting to move over `distance`, for the page to follow on `easing`. */
export interface KeyboardGlide {
  direction: GlideDirection;
  distance: number;
  duration: number;
  easing: string;
}

/**
 * Lets the page follow the keyboard with a transform while the WebView keeps one size, so the
 * page is laid out once per keyboard move instead of once per frame. Rising, the WebView takes
 * its new size at the end; falling, at the start, once the page knows to hold its place.
 *
 * `holding` is true while the room beneath the page ignores the keyboard. Each move's reported
 * heights become the curve the next move that way is drawn with, matching this device.
 */
export function useKeyboardGlide(onGlide: (glide: KeyboardGlide | null) => void) {
  const holding = useSharedValue(false);
  const tracking = useSharedValue(false);
  const frames = useSharedValue<number[]>([]);
  const travel = useRef({ direction: 'up' as GlideDirection, from: 0, to: 0 });
  const curves = useRef<Record<GlideDirection, string>>({
    up: DEFAULT_GLIDE_EASING,
    down: DEFAULT_GLIDE_EASING,
  });

  const announce = useCallback(
    (direction: GlideDirection, from: number, to: number, duration: number) => {
      travel.current = { direction, from, to };
      onGlide({
        direction,
        distance: Math.abs(to - from),
        duration,
        easing: curves.current[direction],
      });
      // Told first, the page is ready to hold its place when the WebView grows right after.
      if (direction === 'down') holding.set(true);
    },
    [holding, onGlide],
  );

  const conclude = useCallback(
    (heights: number[]) => {
      const { direction, from, to } = travel.current;
      curves.current[direction] = glideEasing(heights, from, to) ?? curves.current[direction];
      onGlide(null);
    },
    [onGlide],
  );

  const abandon = useCallback(() => onGlide(null), [onGlide]);

  return useMemo(() => {
    const begin = (from: number, to: number, duration: number, alone: boolean) => {
      'worklet';
      if (tracking.get()) runOnJS(abandon)();
      const direction = ENABLED ? glideDirection(from, to, alone) : null;
      tracking.set(direction !== null);
      frames.set([]);
      // Rising, the room waits from the first frame; falling, only once the page is told.
      holding.set(direction === 'up');
      if (direction) runOnJS(announce)(direction, from, to, duration);
    };

    const track = (height: number) => {
      'worklet';
      if (tracking.get()) frames.set([...frames.get(), height]);
    };

    const end = () => {
      'worklet';
      if (!tracking.get()) return;
      tracking.set(false);
      holding.set(false);
      runOnJS(conclude)(frames.get());
    };

    return { holding, begin, track, end };
  }, [abandon, announce, conclude, frames, holding, tracking]);
}
