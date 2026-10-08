import { Dropdown } from 'antd';

import type { MessageActionsProps } from './MessageActions';
import { useMessageActionScope } from './MessageActionScope';
import { useMessageMenu } from './useMessageMenu';
import { useMessageShortcuts } from './useMessageShortcuts';

/** A message row on a pointer device: actions through the context menu and shortcuts. */
export function DesktopMessageActions({ rowProps, children }: MessageActionsProps) {
  const scope = useMessageActionScope();
  const menu = useMessageMenu();
  const handleShortcut = useMessageShortcuts();

  return (
    <Dropdown trigger={['contextMenu']} menu={menu}>
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
      </div>
    </Dropdown>
  );
}
