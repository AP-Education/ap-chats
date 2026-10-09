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
  | { type: 'composer/gif'; sessionId: string; requestId: number; url: string; title: string };

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
    typeof message.url === 'string' &&
    typeof message.title === 'string'
  )
    return message as NativeComposerMessage;
  return null;
}
