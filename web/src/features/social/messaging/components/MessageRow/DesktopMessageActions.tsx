import { Dropdown } from 'antd';
import { useState } from 'react';

import { QuickReactions } from '@/features/social/reactions/components/QuickReactions/QuickReactions';
import { ReactionPicker } from '@/features/social/reactions/components/ReactionPicker/ReactionPicker';

import type { MessageActionsProps } from './MessageActions';
import { useMessageActionScope } from './MessageActionScope';
import { useMessageMenu } from './useMessageMenu';
import { useMessageShortcuts } from './useMessageShortcuts';

/** A message row on a pointer device: actions through the context menu and shortcuts. */
export function DesktopMessageActions({ rowProps, children }: MessageActionsProps) {
  const scope = useMessageActionScope();
  const menu = useMessageMenu();
  const handleShortcut = useMessageShortcuts();
  const [menuOpen, setMenuOpen] = useState(false);
  const [picking, setPicking] = useState(false);

  const closeMenu = () => setMenuOpen(false);
  const pickAnyReaction = () => {
    closeMenu();
    setPicking(true);
  };
  const quickReactions = scope.canReact && (
    <QuickReactions
      item={scope.item}
      viewerMemberId={scope.context.memberId}
      variant="menu"
      onPicked={closeMenu}
      onMore={pickAnyReaction}
    />
  );

  return (
    <Dropdown
      trigger={['contextMenu']}
      menu={menu}
      open={menuOpen}
      onOpenChange={setMenuOpen}
      popupRender={(menuNode) => (
        <>
          {quickReactions}
          {menuNode}
        </>
      )}
    >
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
    </Dropdown>
  );
}
