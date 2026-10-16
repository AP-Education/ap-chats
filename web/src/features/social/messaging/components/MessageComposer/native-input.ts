import type { GifBlock } from '../../types';
import type { PickerTab } from './picker';

let sessionSequence = 0;

export function createComposerSessionId(): string {
  sessionSequence += 1;
  const random = new Uint32Array(4);
  // getRandomValues is available on LAN HTTP; randomUUID requires a secure context.
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(random);
    return `composer-${Array.from(random, (value) => value.toString(36)).join('-')}`;
  }
  return `composer-${Date.now().toString(36)}-${sessionSequence.toString(36)}`;
}

export type NativeInputMode = 'closed' | 'keyboard' | 'picker' | 'search';

export type NativeComposerMessage =
  | {
      type: 'composer/state';
      sessionId: string;
      requestId: number;
      mode: NativeInputMode;
      tab: PickerTab;
    }
  | { type: 'composer/insert'; sessionId: string; requestId: number; text: string }
  | {
      type: 'composer/gif';
      sessionId: string;
      requestId: number;
      slug: string;
      title: string;
      media: GifBlock['media'];
      /** Missing from shells built before it was sent. */
      placeholder?: string | null;
    };

function isGifMedia(value: unknown): value is GifBlock['media'] {
  if (!value || typeof value !== 'object') return false;
  const media = value as Record<string, unknown>;
  return (
    typeof media.url === 'string' &&
    typeof media.width === 'number' &&
    typeof media.height === 'number'
  );
}

export function readComposerMessage(
  value: unknown,
  sessionId: string,
  requestId: number,
): NativeComposerMessage | null {
  if (!value || typeof value !== 'object') return null;
  const message = value as Record<string, unknown>;
  if (message.sessionId !== sessionId || message.requestId !== requestId) return null;
  if (
    message.type === 'composer/state' &&
    ['closed', 'keyboard', 'picker', 'search'].includes(String(message.mode)) &&
    ['emoji', 'gif', 'sticker'].includes(String(message.tab))
  )
    return message as NativeComposerMessage;
  if (message.type === 'composer/insert' && typeof message.text === 'string')
    return message as NativeComposerMessage;
  if (
    message.type === 'composer/gif' &&
    typeof message.slug === 'string' &&
    typeof message.title === 'string' &&
    isGifMedia(message.media) &&
    (message.placeholder == null || typeof message.placeholder === 'string')
  )
    return message as NativeComposerMessage;
  return null;
}

/** The native keyboard starting to move over the page, or done moving. */
export type KeyboardGlideMessage =
  | {
      type: 'keyboard/glide';
      direction: 'up' | 'down';
      shift: number;
      duration: number;
      /** The keyboard's own curve, when the shell has watched it move that way. */
      easing?: string;
    }
  | { type: 'keyboard/glide-end' };

/** How much of the page's bottom the native input now covers, and how it gets there. */
export interface KeyboardInsetMessage {
  type: 'keyboard/inset';
  inset: number;
  duration: number;
  easing?: string;
}

const GLIDE_EASING = /^(linear\([\d., %]+\)|cubic-bezier\([\d., -]+\))$/;

export function readKeyboardGlide(
  value: unknown,
): KeyboardGlideMessage | KeyboardInsetMessage | null {
  if (!value || typeof value !== 'object') return null;
  const message = value as Record<string, unknown>;
  if (message.type === 'keyboard/glide-end') return { type: 'keyboard/glide-end' };

  const { inset, shift, duration, easing } = message;
  const validEasing = typeof easing === 'string' && GLIDE_EASING.test(easing);
  if (message.type === 'keyboard/inset') {
    if (!Number.isFinite(inset) || !Number.isFinite(duration)) return null;
    return {
      type: 'keyboard/inset',
      inset: inset as number,
      duration: duration as number,
      ...(validEasing ? { easing } : {}),
    };
  }

  const isGlide = message.type === 'keyboard/glide';
  if (!isGlide || !Number.isFinite(shift) || !Number.isFinite(duration)) return null;

  return {
    type: 'keyboard/glide',
    // Shells that predate falling glides announce rises alone.
    direction: message.direction === 'down' ? 'down' : 'up',
    shift: shift as number,
    duration: duration as number,
    ...(validEasing ? { easing } : {}),
  };
}
