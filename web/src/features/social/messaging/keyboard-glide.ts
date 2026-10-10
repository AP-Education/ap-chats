import type { CSSProperties } from 'react';

import type { KeyboardGlideMessage } from './components/MessageComposer/native-input';

interface GlideMotion {
  shift: number;
  duration: number;
  easing: string | undefined;
}

/**
 * How the conversation's lower parts follow the native keyboard while the page keeps its size:
 * `rising` until the page shrinks, `awaiting` a fall until it grows, then `falling` back down.
 */
export type GlidePhase =
  { kind: 'rest' } | ({ kind: 'rising' | 'awaiting' | 'falling' } & GlideMotion);

export type GlideEvent =
  | KeyboardGlideMessage
  | { type: 'resized' }
  /** No resize came to end a rise or start a fall. */
  | { type: 'expired' }
  /** A fall has played out. */
  | { type: 'settled' };

export const GLIDE_REST: GlidePhase = { kind: 'rest' };

export function glideReducer(phase: GlidePhase, event: GlideEvent): GlidePhase {
  switch (event.type) {
    case 'keyboard/glide': {
      const kind = event.direction === 'up' ? 'rising' : 'awaiting';
      return { kind, shift: event.shift, duration: event.duration, easing: event.easing };
    }
    case 'resized':
      if (phase.kind === 'rising') return GLIDE_REST;
      if (phase.kind === 'awaiting') return { ...phase, kind: 'falling' };
      return phase;
    case 'expired':
      return phase.kind === 'rising' || phase.kind === 'awaiting' ? GLIDE_REST : phase;
    case 'settled':
      return phase.kind === 'falling' ? GLIDE_REST : phase;
    case 'keyboard/glide-end':
      return phase;
  }
}

/** The phase as the attributes the gliding parts read from the conversation surface. */
export function glideSurfaceProps(phase: GlidePhase) {
  if (phase.kind === 'rest' || phase.kind === 'awaiting') return {};

  return {
    'data-keyboard-glide': phase.kind,
    style: {
      '--keyboard-glide-shift': `${phase.shift}px`,
      '--keyboard-glide-duration': `${phase.duration}ms`,
      '--keyboard-glide-easing': phase.easing,
    } as CSSProperties,
  };
}
