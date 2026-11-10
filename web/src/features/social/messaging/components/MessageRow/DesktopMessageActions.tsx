import { TimelineEntry } from '@ap-education/timeline/react';
import { ContextActions } from '@ap-education/ui';
import { useState } from 'react';

import { QuickReactions } from '@/features/social/reactions/components/QuickReactions/QuickReactions';
import { ReactionPicker } from '@/features/social/reactions/components/ReactionPicker/ReactionPicker';

import type { MessageActionsProps } from './MessageActions';
import { useMessageActionScope } from './MessageActionScope';
import { useMessageMenu } from './useMessageMenu';
import { useMessageShortcuts } from './useMessageShortcuts';
import { useOwnMessageStatus } from './useOwnMessageStatus';

/** A message row on a pointer device: actions through the context menu and shortcuts. */
export function DesktopMessageActions({ rowProps, children }: MessageActionsProps) {
  const scope = useMessageActionScope();
  const status = useOwnMessageStatus();
  const { groups, select } = useMessageMenu();
  const handleShortcut = useMessageShortcuts();
  const [picking, setPicking] = useState(false);

  const quickReactions = (closeMenu: () => void) =>
    scope.canReact && (
      <QuickReactions
        item={scope.item}
        viewerMemberId={scope.context.memberId}
        variant="menu"
        onPicked={closeMenu}
        onMore={() => {
          closeMenu();
          setPicking(true);
        }}
      />
    );

  return (
    <ContextActions groups={groups} onSelect={select} header={quickReactions}>
      <TimelineEntry asChild side={scope.isOwn ? 'end' : 'start'} status={status}>
        <div
          {...rowProps}
          onMouseUp={scope.captureSelection}
          onContextMenu={scope.captureSelection}
          onKeyDown={(event) => {
            rowProps.onKeyDown?.(event);
            handleShortcut(event);
          }}
        >
          {children}
          {picking && (
            <ReactionPicker
              item={scope.item}
              viewerMemberId={scope.context.memberId}
              own={scope.isOwn}
              onClose={() => setPicking(false)}
            />
          )}
        </div>
      </TimelineEntry>
    </ContextActions>
  );
}
