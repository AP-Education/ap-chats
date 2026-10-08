import { postToNative } from '@ap-education/shell-sdk';

export function selectionHaptic(): void {
  postToNative({ type: 'haptics/selection' });
}
