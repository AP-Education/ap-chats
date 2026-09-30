import type { HTMLAttributes, ReactNode } from 'react';

import { DesktopMessageActions } from './DesktopMessageActions';
import { useMessageActionScope } from './MessageActionScope';

export type MessageRowAttributes = HTMLAttributes<HTMLDivElement> & {
  [key: `data-${string}`]: string | boolean | undefined;
};

export interface MessageActionsProps {
  rowProps: MessageRowAttributes;
  children: ReactNode;
}

export function MessageActions({ rowProps, children }: MessageActionsProps) {
  const { isMobile } = useMessageActionScope();
  if (isMobile) return <div {...rowProps}>{children}</div>;
  return <DesktopMessageActions rowProps={rowProps}>{children}</DesktopMessageActions>;
}
