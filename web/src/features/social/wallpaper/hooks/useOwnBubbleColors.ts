import { useShellAppearance } from '@ap-education/shell-sdk';
import { findAccent } from '@ap-education/ui';
import type { CSSProperties } from 'react';

/** Own bubbles wear the accent the person picked in the shell, in tones deep enough for white text. */
export function useOwnBubbleColors(): CSSProperties {
  const [from, to] = findAccent(useShellAppearance().accent).deep;
  return { '--chat-own-from': from, '--chat-own-to': to } as CSSProperties;
}
