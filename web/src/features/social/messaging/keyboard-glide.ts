import { css, keyframes } from 'antd-style';
import type { CSSProperties } from 'react';

type GlideDirection = 'up' | 'down';

interface GlideMotion {
  shift: number;
  duration: number;
  easing: string;
}

/** What the native shell tells the page as its keyboard moves. */
export type KeyboardGlideMessage =
  | ({ type: 'keyboard/glide'; direction: GlideDirection } & GlideMotion)
  | { type: 'keyboard/glide-end' };

/**
 * How the conversation's lower parts follow the native keyboard while the page keeps its size:
 * `rising` slides them up until the page shrinks to the keyboard; `awaiting` holds a fall until
 * the page grows back; `falling` then lets them down from where they stood.
 */
export type GlidePhase =
  { kind: 'rest' } | ({ kind: 'rising' | 'awaiting' | 'falling' } & GlideMotion);

export type GlideEvent = KeyboardGlideMessage | { type: 'resized' } | { type: 'expired' };

export const GLIDE_REST: GlidePhase = { kind: 'rest' };

// What a keyboard that hasn't been watched yet moves on; also the fallback where linear() isn't.
const DEFAULT_EASING = 'cubic-bezier(0.38, 0.7, 0.125, 1)';
const EASING = /^(linear\([\d., ]+\)|cubic-bezier\([\d., -]+\))$/;

export function readKeyboardGlide(value: unknown): KeyboardGlideMessage | null {
  if (!value || typeof value !== 'object') return null;
  const message = value as Record<string, unknown>;
  if (message.type === 'keyboard/glide-end') return { type: 'keyboard/glide-end' };
  if (
    message.type !== 'keyboard/glide' ||
    !Number.isFinite(message.shift) ||
    !Number.isFinite(message.duration) ||
    typeof message.easing !== 'string' ||
    !EASING.test(message.easing)
  )
    return null;

  const unsupported =
    message.easing.startsWith('linear(') &&
    typeof CSS !== 'undefined' &&
    !CSS.supports('animation-timing-function', message.easing);
  return {
    type: 'keyboard/glide',
    // Shells that predate falling glides announce rises alone.
    direction: message.direction === 'down' ? 'down' : 'up',
    shift: message.shift as number,
    duration: message.duration as number,
    easing: unsupported ? DEFAULT_EASING : message.easing,
  };
}

export function glideReducer(phase: GlidePhase, event: GlideEvent): GlidePhase {
  if (event.type === 'keyboard/glide') {
    const { shift, duration, easing } = event;
    return { kind: event.direction === 'up' ? 'rising' : 'awaiting', shift, duration, easing };
  }
  if (event.type === 'resized') {
    if (phase.kind === 'rising') return GLIDE_REST;
    if (phase.kind === 'awaiting') return { ...phase, kind: 'falling' };
    return phase;
  }
  // No resize came to end the glide: let go rather than hang.
  if (event.type === 'expired' && (phase.kind === 'rising' || phase.kind === 'awaiting'))
    return GLIDE_REST;
  return phase;
}

/** The phase as attributes for the conversation surface its gliding parts read. */
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

const rise = keyframes`
  to { translate: 0 calc(-1 * var(--keyboard-glide-shift)); }
`;

const fall = keyframes`
  from { translate: 0 calc(-1 * var(--keyboard-glide-shift)); }
`;

/**
 * For each part of a conversation that moves with the keyboard. Kept on its own layer in the
 * app, so a glide starting or ending never adds or drops one in the middle of a frame.
 */
export const keyboardGlidePart = css`
  html[data-native-shell='true'] & {
    will-change: translate;
  }

  [data-keyboard-glide='rising'] & {
    animation: ${rise} var(--keyboard-glide-duration) var(--keyboard-glide-easing) forwards;
  }

  [data-keyboard-glide='falling'] & {
    animation: ${fall} var(--keyboard-glide-duration) var(--keyboard-glide-easing);
  }
`;
