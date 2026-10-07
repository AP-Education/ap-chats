import type { HTMLAttributes, ReactNode } from 'react';

import { DesktopMessageActions, DesktopMessageToolbar } from './DesktopMessageActions';
import { useMessageActionScope } from './MessageActionScope';
import { MessageTouchActions } from './MessageTouchActions';

export type MessageRowAttributes = HTMLAttributes<HTMLDivElement> & {
  [key: `data-${string}`]: string | boolean | undefined;
};

export interface MessageActionsProps {
  rowProps: MessageRowAttributes;
  children: ReactNode;
}

export function MessageActions({ rowProps, children }: MessageActionsProps) {
  const { isMobile } = useMessageActionScope();
  if (isMobile) return <MessageTouchActions rowProps={rowProps}>{children}</MessageTouchActions>;
  return <DesktopMessageActions rowProps={rowProps}>{children}</DesktopMessageActions>;
}

// Touch screens reach the same actions through long press and swipe instead.
export function MessageToolbar() {
  const { isMobile } = useMessageActionScope();
  if (isMobile) return null;
  return <DesktopMessageToolbar />;
}
