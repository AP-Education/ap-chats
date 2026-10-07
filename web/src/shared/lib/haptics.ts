import { postToNative } from './nativeBridge';

export function selectionHaptic(): void {
  postToNative({ type: 'haptics/selection' });
}
