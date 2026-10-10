import { Popover } from 'antd';
import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';

const useStyles = createStyles(({ css }) => ({
  // A point at the top corner of the row on the author's side, for the popover to open from.
  anchor: css`
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;

    &[data-own] {
      right: 0;
      left: auto;
    }
  `,
  panel: css`
    display: flex;
    flex-direction: column;
    width: 352px;
    height: 400px;
  `,
}));

interface ReactionPickerPopoverProps {
  own: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** Opens beside the message it is placed in; the row is its positioning context. */
export function ReactionPickerPopover({ own, onClose, children }: ReactionPickerPopoverProps) {
  const { styles } = useStyles();

  return (
    <Popover
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      trigger="click"
      placement={own ? 'topRight' : 'topLeft'}
      arrow={false}
      content={<div className={styles.panel}>{children}</div>}
    >
      <span className={styles.anchor} data-own={own || undefined} aria-hidden="true" />
    </Popover>
  );
}
