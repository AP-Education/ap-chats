import { type NativeModule, requireOptionalNativeModule } from 'expo';

type KeyboardFrameEvents = {
  onChange: (event: { height: number }) => void;
};

declare class KeyboardFrameNativeModule extends NativeModule<KeyboardFrameEvents> {
  visibleHeight(): number;
}

// Android only; optional so a build made before this module existed keeps the IME insets alone.
const KeyboardFrame = requireOptionalNativeModule<KeyboardFrameNativeModule>('KeyboardFrame');

/** How much of the window's bottom the keyboard visibly covers, in dp; 0 where unknown. */
export function visibleKeyboardHeight(): number {
  return KeyboardFrame?.visibleHeight() ?? 0;
}

export function onVisibleKeyboardHeight(listener: (height: number) => void): () => void {
  const subscription = KeyboardFrame?.addListener('onChange', ({ height }) => listener(height));
  return () => subscription?.remove();
}
