import { useCallback, useMemo } from 'react';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

import {
  DEFAULT_EASING,
  type InsetMotion,
  type KeyboardDirection,
  keyboardDirection,
  type KeyboardFrame,
  learnedMotion,
} from '../utils/keyboard-curve';

interface Move {
  direction: KeyboardDirection;
  from: number;
  to: number;
  started: number;
}

/** Watches each full keyboard move so the next one that way is described the way this device moves. */
export function useKeyboardCurves() {
  const learned = useSharedValue<Partial<Record<KeyboardDirection, InsetMotion>>>({});
  const move = useSharedValue<Move | null>(null);
  const frames = useSharedValue<KeyboardFrame[]>([]);

  const learn = useCallback(
    (finished: Move, moved: KeyboardFrame[]) => {
      const motion = learnedMotion(moved, finished.from, finished.to, finished.started);
      if (motion) learned.set({ ...learned.get(), [finished.direction]: motion });
    },
    [learned],
  );

  return useMemo(() => {
    /** How this keyboard move will play out, by what earlier moves that way showed. */
    const motion = (from: number, to: number, reported: number): InsetMotion => {
      'worklet';
      const known = learned.get()[to > from ? 'up' : 'down'];
      return known ?? { duration: reported, easing: DEFAULT_EASING };
    };

    const begin = (from: number, to: number) => {
      'worklet';
      const direction = keyboardDirection(from, to);
      move.set(direction ? { direction, from, to, started: Date.now() } : null);
      frames.set([]);
    };

    const track = (height: number) => {
      'worklet';
      if (move.get()) frames.set([...frames.get(), { height, time: Date.now() }]);
    };

    const end = () => {
      'worklet';
      const finished = move.get();
      if (!finished) return;

      move.set(null);
      runOnJS(learn)(finished, frames.get());
    };

    return { motion, begin, track, end };
  }, [frames, learn, learned, move]);
}
