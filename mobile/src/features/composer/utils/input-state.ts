import type { PickerTab } from '../types';

export type InputMode = 'closed' | 'keyboard' | 'picker' | 'search';

export interface ComposerInputState {
  sessionId: string | null;
  requestId: number;
  mode: InputMode;
  tab: PickerTab;
}

export type ComposerInputRequest =
  | { type: 'composer/attach'; sessionId: string }
  | { type: 'composer/detach'; sessionId: string }
  | {
      type: 'composer/input';
      sessionId: string;
      requestId: number;
      mode: 'closed' | 'keyboard' | 'picker';
      tab?: PickerTab;
    };

export const initialInputState: ComposerInputState = {
  sessionId: null,
  requestId: 0,
  mode: 'closed',
  tab: 'emoji',
};

export function applyInputRequest(
  state: ComposerInputState,
  request: ComposerInputRequest,
): ComposerInputState {
  if (request.type === 'composer/attach') {
    if (request.sessionId === state.sessionId) return state;
    return { ...initialInputState, sessionId: request.sessionId };
  }
  if (request.sessionId !== state.sessionId) return state;
  if (request.type === 'composer/detach') return initialInputState;
  if (request.requestId <= state.requestId) return state;
  return {
    ...state,
    requestId: request.requestId,
    mode: request.mode,
    tab: request.tab ?? state.tab,
  };
}

export function isComposerInputRequest(value: unknown): value is ComposerInputRequest {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  if (
    typeof message.sessionId !== 'string' ||
    !message.sessionId ||
    message.sessionId.length > 2048
  )
    return false;
  if (message.type === 'composer/attach' || message.type === 'composer/detach') return true;
  return (
    message.type === 'composer/input' &&
    Number.isSafeInteger(message.requestId) &&
    Number(message.requestId) > 0 &&
    ['closed', 'keyboard', 'picker'].includes(String(message.mode)) &&
    (message.tab === undefined || ['emoji', 'gif', 'sticker'].includes(String(message.tab)))
  );
}

export function inputAreaHeight(
  mode: InputMode,
  keyboardHeight: number,
  panelHeight: number,
  heldHeight: number,
  bottomInset: number,
  containerHeight: number,
): number {
  'worklet';
  const keyboard = Math.max(0, keyboardHeight);
  if (mode === 'search') {
    const results = Math.min(panelHeight, Math.max(96, containerHeight - keyboard - 160));
    return keyboard + results;
  }
  return Math.max(bottomInset, keyboard, panelHeight, heldHeight);
}
