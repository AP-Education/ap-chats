import { Popover } from 'antd';
import { createStyles } from 'antd-style';
import { type ReactNode, type RefObject, useRef } from 'react';
import { useOnClickOutside } from 'usehooks-ts';

import type { Gif } from '../../gifs/types';
import { PickerPanel, type PickerTab } from './picker';

const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 440;

const useStyles = createStyles(({ css }) => ({
  panel: css`
    width: ${PANEL_WIDTH}px;
    height: ${PANEL_HEIGHT}px;
  `,
}));

interface DesktopPickerPopoverProps {
  activeTab: PickerTab | null;
  onTabChange: (tab: PickerTab) => void;
  onPickEmoji: (emoji: string) => void;
  onPickGif: (gif: Gif) => void;
  onClose: () => void;
  className: string;
  /** The buttons that open the panel; a press on them switches tabs rather than closing it. */
  children: ReactNode;
}

/** The picker on desktop: a popover over its own buttons, closed by any press outside both. */
export function DesktopPickerPopover({
  activeTab,
  onTabChange,
  onPickEmoji,
  onPickGif,
  onClose,
  className,
  children,
}: DesktopPickerPopoverProps) {
  const { styles } = useStyles();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const isOpen = activeTab !== null;

  // usehooks-ts still types refs as they were before React 19 made them nullable.
  useOnClickOutside([panelRef, buttonsRef] as RefObject<HTMLElement>[], () => {
    if (isOpen) onClose();
  });

  return (
    <Popover
      trigger={[]}
      open={isOpen}
      placement="topRight"
      content={
        <div ref={panelRef} className={styles.panel}>
          <PickerPanel
            activeTab={activeTab ?? 'emoji'}
            onTabChange={onTabChange}
            onPickEmoji={onPickEmoji}
            onPickGif={onPickGif}
          />
        </div>
      }
    >
      <div ref={buttonsRef} className={className}>
        {children}
      </div>
    </Popover>
  );
}
